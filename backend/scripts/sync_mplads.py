"""
MPLADS Guardian — Main Sync Script

Usage:
  python scripts/sync_mplads.py --all
  python scripts/sync_mplads.py --house lok_sabha --term 18
  python scripts/sync_mplads.py --house lok_sabha --term 17
  python scripts/sync_mplads.py --house rajya_sabha
  python scripts/sync_mplads.py --all --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add backend root to path so local imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from ingestion.mplads_client import EsakshiClient
from ingestion.transformers import transform_all
from ingestion.validators import validate_all
from ingestion.deduplication import deduplicate_all, extract_mps
from models.database import SessionLocal, create_all_tables
from models.orm import MP, Allocation, Work, Expenditure, SyncMetadata

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("sync_mplads")


# ---------------------------------------------------------------------------
# Raw data persistence
# ---------------------------------------------------------------------------

def save_raw(raw_data: dict, house: str, ls_term: str | None, data_dir: Path) -> None:
    """Save raw API responses to disk before any transformation."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Map to directory path
    if house == "lok_sabha":
        subdir = data_dir / "lok_sabha" / f"term_{ls_term}"
    else:
        subdir = data_dir / "rajya_sabha"
    subdir.mkdir(parents=True, exist_ok=True)

    house_key = f"{house}_{ls_term}" if ls_term else house
    source = raw_data.get(house_key, {})

    for data_type, records in source.items():
        if data_type == "metadata":
            continue
        out_path = subdir / f"{data_type}_{today}.json"
        out_path.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.info("Raw data saved: %s (%d records)", out_path, len(records))


def load_json_with_fallback(filepath: Path) -> dict | list | None:
    """Load JSON, gracefully upgrading legacy cp1252 files to utf-8. Returns None if file is empty/corrupt."""
    try:
        content = filepath.read_text(encoding="utf-8")
        if not content.strip():
            logger.warning("File %s is empty.", filepath.name)
            return None
        return json.loads(content)
    except UnicodeDecodeError:
        logger.warning("Legacy encoding detected in %s. Migrating to UTF-8...", filepath.name)
        content = filepath.read_text(encoding="cp1252")
        if not content.strip():
            logger.warning("File %s is empty.", filepath.name)
            return None
        try:
            data = json.loads(content)
            filepath.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            return data
        except json.JSONDecodeError as exc:
            logger.warning("File %s is corrupt (%s).", filepath.name, exc)
            return None
    except json.JSONDecodeError as exc:
        logger.warning("File %s is corrupt (%s).", filepath.name, exc)
        return None


# ---------------------------------------------------------------------------
# Database persistence
# ---------------------------------------------------------------------------

def _upsert_mps(db, mp_list: list[dict]) -> int:
    count = 0
    for mp_data in mp_list:
        existing = db.query(MP).filter(MP.entity_key == mp_data["entity_key"]).first()
        if existing:
            existing.state        = mp_data["state"]
            existing.constituency = mp_data["constituency"]
        else:
            db.add(MP(**{k: v for k, v in mp_data.items() if k != "entity_key"}, entity_key=mp_data["entity_key"]))
            count += 1
    db.flush()
    return count


def _mp_id_map(db) -> dict[str, str]:
    """Return {entity_key: mp_id} map from DB."""
    rows = db.query(MP.entity_key, MP.mp_id).all()
    return {r.entity_key: r.mp_id for r in rows}


def _entity_key(mp_name: str, house: str, constituency: str) -> str:
    return f"{mp_name.strip().lower()}|{house}|{constituency.strip().lower()}"


def _resolve_mp_id(mp_id_map: dict, mp_name: str, house: str, constituency: str) -> str | None:
    return mp_id_map.get(_entity_key(mp_name, house, constituency))


def persist_all(deduped: dict, mp_list: list[dict], scope: str, dry_run: bool, partial: bool = False) -> dict[str, int]:
    """
    Persist all normalised data to the database.
    Clears existing records for each (house, ls_term) scope before inserting.
    If partial=True, skips clearing existing records because we might be missing some datasets.
    """
    counts = {"mps": 0, "allocations": 0, "works": 0, "expenditures": 0}

    if dry_run:
        logger.info("[DRY RUN] Would persist: alloc=%d works_c=%d works_r=%d exp=%d",
                    len(deduped["allocations"]),
                    len(deduped["works_completed"]),
                    len(deduped["works_recommended"]),
                    len(deduped["expenditures"]))
        counts["mps"]          = len(mp_list)
        counts["allocations"]  = len(deduped["allocations"])
        counts["works"]        = len(deduped["works_completed"]) + len(deduped["works_recommended"])
        counts["expenditures"] = len(deduped["expenditures"])
        return counts

    db = SessionLocal()
    try:
        # MPs
        counts["mps"] = _upsert_mps(db, mp_list)
        db.commit()
        mp_id_map = _mp_id_map(db)

        # --- Determine scopes to clear ---
        scopes: set[tuple] = set()
        for r in deduped["allocations"] + deduped["works_completed"] + \
                 deduped["works_recommended"] + deduped["expenditures"]:
            scopes.add((r["house"], r.get("ls_term")))

        if not partial:
            for house, ls_term in scopes:
                logger.info("Clearing scope house=%s ls_term=%s", house, ls_term)
                filt = lambda q, m: (
                    q.filter(m.house == house, m.ls_term == ls_term)
                    if ls_term is not None
                    else q.filter(m.house == house, m.ls_term.is_(None))
                )
                filt(db.query(Expenditure), Expenditure).delete(synchronize_session=False)
                filt(db.query(Work), Work).delete(synchronize_session=False)
                filt(db.query(Allocation), Allocation).delete(synchronize_session=False)
            db.commit()

        # --- Allocations ---
        for a in deduped["allocations"]:
            mid = _resolve_mp_id(mp_id_map, a["mp_name"], a["house"], a["constituency"])
            db.add(Allocation(
                mp_id=mid,
                mp_name=a["mp_name"],
                house=a["house"],
                ls_term=a.get("ls_term"),
                state=a["state"],
                constituency=a["constituency"],
                allocated_amount=a["allocated_amount"],
                sr_no=a.get("sr_no"),
                fetched_at=a["fetched_at"],
                source_combo=a["source_combo"],
                source_key=a["source_key"],
            ))
        db.flush()
        counts["allocations"] = len(deduped["allocations"])

        # --- Works (completed) ---
        for w in deduped["works_completed"]:
            mid = _resolve_mp_id(mp_id_map, w["mp_name"], w["house"], w["constituency"])
            db.add(Work(
                work_id=w["work_id"],
                mp_id=mid,
                mp_name=w["mp_name"],
                house=w["house"],
                ls_term=w.get("ls_term"),
                state=w["state"],
                constituency=w["constituency"],
                work_category=w.get("work_category"),
                work_description=w.get("work_description"),
                implementing_agency=w.get("implementing_agency"),
                recommendation_date=w.get("recommendation_date"),
                recommended_amount=w.get("recommended_amount", 0.0),
                completion_date=w.get("completion_date"),
                final_amount=w.get("final_amount", 0.0),
                work_status="Completed",
                has_image=bool(w.get("has_image")),
                average_rating=w.get("average_rating"),
                fetched_at=w["fetched_at"],
                source_combo=w["source_combo"],
                source_key=w["source_key"],
            ))
        db.flush()

        # Build work_id → db pk map for expenditure FK
        completed_work_ids: set[int] = {w["work_id"] for w in deduped["works_completed"]}

        # --- Works (recommended — not already completed) ---
        for w in deduped["works_recommended"]:
            mid = _resolve_mp_id(mp_id_map, w["mp_name"], w["house"], w["constituency"])
            db.add(Work(
                work_id=w["work_id"],
                mp_id=mid,
                mp_name=w["mp_name"],
                house=w["house"],
                ls_term=w.get("ls_term"),
                state=w["state"],
                constituency=w["constituency"],
                work_category=w.get("work_category"),
                work_description=w.get("work_description"),
                implementing_agency=w.get("implementing_agency"),
                recommendation_date=w.get("recommendation_date"),
                recommended_amount=w.get("recommended_amount", 0.0),
                completion_date=None,
                final_amount=0.0,
                work_status="Recommended",
                has_image=bool(w.get("has_image")),
                average_rating=None,
                fetched_at=w["fetched_at"],
                source_combo=w["source_combo"],
                source_key=w["source_key"],
            ))
        db.flush()
        counts["works"] = len(deduped["works_completed"]) + len(deduped["works_recommended"])

        # --- Expenditures ---
        for e in deduped["expenditures"]:
            mid = _resolve_mp_id(mp_id_map, e["mp_name"], e["house"], e["constituency"])
            db.add(Expenditure(
                work_id=e.get("work_id") or None,
                mp_id=mid,
                mp_name=e["mp_name"],
                house=e["house"],
                ls_term=e.get("ls_term"),
                state=e["state"],
                constituency=e["constituency"],
                work_description=e.get("work_description"),
                vendor=e.get("vendor"),
                implementing_agency=e.get("implementing_agency"),
                expenditure_date=e.get("expenditure_date"),
                payment_status=e.get("payment_status"),
                expenditure_amount=e["expenditure_amount"],
                fetched_at=e["fetched_at"],
                source_combo=e["source_combo"],
                source_key=e["source_key"],
            ))
        counts["expenditures"] = len(deduped["expenditures"])
        db.commit()

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    return counts


def write_sync_metadata(house_label: str, ls_term: int | None, counts: dict, duration: float,
                        quality_pct: float, status: str, error: str | None = None, failed_datasets: list | None = None) -> None:
    db = SessionLocal()
    try:
        db.add(SyncMetadata(
            house=house_label,
            ls_term=ls_term,
            source="eSAKSHI",
            last_sync=datetime.now(timezone.utc),
            records_fetched=counts.get("fetched", 0),
            records_inserted=sum(counts.get(k, 0) for k in ("mps", "allocations", "works", "expenditures")),
            sync_duration_secs=duration,
            data_quality_pct=quality_pct,
            status=status,
            error_message=error,
            failed_datasets=json.dumps(failed_datasets) if failed_datasets else None,
        ))
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="MPLADS Guardian — Sync Script")
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Sync all houses and terms")
    group.add_argument("--house", choices=["lok_sabha", "rajya_sabha"])

    p.add_argument("--term", choices=["17", "18"], help="Lok Sabha term (only with --house lok_sabha)")
    p.add_argument("--dry-run", action="store_true", help="Fetch and transform but skip storage")
    p.add_argument("--skip-raw", action="store_true", help="Skip saving raw JSON to disk")
    return p.parse_args()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()

    # Determine ls_term option
    if args.all:
        ls_term_option = "both"
    elif args.house == "rajya_sabha":
        ls_term_option = "both"  # only RS will be fetched; LS is empty
    else:
        if not args.term:
            logger.error("--term is required when using --house lok_sabha")
            sys.exit(1)
        ls_term_option = args.term

    logger.info("═" * 55)
    logger.info("MPLADS Guardian — Ingestion Sync")
    logger.info("  ls_term_option : %s", ls_term_option)
    logger.info("  dry_run        : %s", args.dry_run)
    logger.info("═" * 55)

    # Ensure DB tables exist
    create_all_tables()

    raw_dir = settings.raw_data_path
    validation_dir = settings.validation_data_path

    start = time.time()
    client = EsakshiClient(data_dir=Path(settings.session_data_dir))

    try:
        # STEP 1: Fetch
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        raw_data = {"metadata": {"fetch_time": today}}
        errors = []
        
        for label, source_key, ls_t, is_ls in [
            ("lok_sabha", "lok_sabha_18", "18", True),
            ("lok_sabha", "lok_sabha_17", "17", True),
            ("rajya_sabha", "rajya_sabha", None, False),
        ]:
            if ls_term_option != "both":
                if is_ls and ls_term_option != ls_t:
                    continue
                if not is_ls and args.house == "lok_sabha":
                    continue

            combo_key = (label, ls_t)
            from ingestion.mplads_client import COMBO, DATA_TYPE_KEYS
            combo = COMBO[combo_key]
            
            subdir = raw_dir / label / (f"term_{ls_t}" if ls_t else "")
            subdir.mkdir(parents=True, exist_ok=True)
            
            house_data = {}
            for dt in DATA_TYPE_KEYS.keys():
                out = subdir / f"{dt}_{today}.json"
                if out.exists():
                    loaded = load_json_with_fallback(out)
                    if loaded is not None:
                        logger.info("Skipping %s for %s — already fetched today", dt, source_key)
                        house_data[dt] = loaded
                        continue
                    else:
                        logger.info("Existing file %s is invalid, refetching...", out.name)
                    
                try:
                    res = client.fetch_one(combo, dt)
                    house_data[dt] = res
                    if not args.skip_raw:
                        out.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
                        logger.info("Raw saved: %s (%d records)", out, len(res))
                except Exception as exc:
                    logger.error("Failed fetching %s %s: %s", source_key, dt, exc)
                    house_data[dt] = []
                    errors.append({
                        "house": label, "ls_term": ls_t, "dataset": dt, "error": str(exc),
                        "retry_count": settings.max_retries,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                time.sleep(settings.inter_request_delay)
            
            raw_data[source_key] = house_data

        # STEP 3: Transform
        transformed = transform_all(raw_data)

        # STEP 4: Validate
        validated, report = validate_all(transformed, report_dir=validation_dir)

        # STEP 5: Deduplicate
        deduped = deduplicate_all(validated)
        mp_list = extract_mps(deduped["allocations"])

        # STEP 6: Persist
        has_errors = len(errors) > 0
        all_failed = len(errors) == sum(len(raw_data[k]) for k in raw_data if k != "metadata")
        if all_failed and has_errors:
            logger.error("All datasets failed to fetch.")
            counts = {"mps": 0, "allocations": 0, "works": 0, "expenditures": 0}
        else:
            counts = persist_all(deduped, mp_list, ls_term_option, args.dry_run, partial=has_errors)

        elapsed = time.time() - start
        logger.info("═" * 55)
        logger.info("✅ Sync complete in %.1fs", elapsed)
        logger.info("  MPs:          %d", counts["mps"])
        logger.info("  Allocations:  %d", counts["allocations"])
        logger.info("  Works:        %d", counts["works"])
        logger.info("  Expenditures: %d", counts["expenditures"])
        logger.info("  Data quality: %.1f%%", report.data_quality_pct)
        logger.info("═" * 55)

        if not args.dry_run:
            status = "failed" if all_failed else ("partial_success" if has_errors else "success")
            try:
                write_sync_metadata(
                    house_label=args.house or "all",
                    ls_term=int(args.term) if args.term else None,
                    counts={**counts, "fetched": report.total if not all_failed else 0},
                    duration=elapsed,
                    quality_pct=report.data_quality_pct if not all_failed else 0.0,
                    status=status,
                    failed_datasets=errors if has_errors else None,
                )
            except Exception as meta_exc:
                logger.error("Failed to save successful sync metadata: %s", meta_exc)

    except Exception as exc:
        elapsed = time.time() - start
        logger.exception("Sync failed after %.1fs: %s", elapsed, exc)
        if not args.dry_run:
            try:
                write_sync_metadata(
                    house_label=getattr(args, "house", None) or "all",
                    ls_term=int(args.term) if getattr(args, "term", None) else None,
                    counts={},
                    duration=elapsed,
                    quality_pct=0.0,
                    status="error",
                    error=str(exc),
                )
            except Exception as meta_exc:
                logger.error("Could not write failure metadata: %s", meta_exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
