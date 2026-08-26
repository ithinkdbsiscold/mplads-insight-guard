"""
Post-migration validation: compares SQLite source against PostgreSQL target.

Run AFTER migrate_sqlite_to_postgres.py to verify data integrity.

Usage:
    python scripts/validate_migration.py
"""
import os
import sys
import logging

sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, func, text
from sqlalchemy.orm import sessionmaker
from models.orm import MP, Allocation, Work, Expenditure, SyncMetadata
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def validate():
    sqlite_url = "sqlite:///./data/guardian.db"
    postgres_url = settings.database_url

    if postgres_url.startswith("sqlite"):
        logger.error("DATABASE_URL is set to SQLite. Set it to PostgreSQL to validate migration.")
        sys.exit(1)

    sqlite_engine = create_engine(sqlite_url)
    pg_engine = create_engine(postgres_url)

    SqliteSession = sessionmaker(bind=sqlite_engine)
    PgSession = sessionmaker(bind=pg_engine)

    passed = 0
    failed = 0

    with SqliteSession() as sq, PgSession() as pg:
        # ── Row counts ──────────────────────────────────────────────────────
        tables = [
            (MP, "MPs"),
            (Allocation, "Allocations"),
            (Work, "Works"),
            (Expenditure, "Expenditures"),
            (SyncMetadata, "SyncMetadata"),
        ]

        logger.info("=" * 60)
        logger.info("ROW COUNT COMPARISON")
        logger.info("=" * 60)
        logger.info(f"{'Table':<20} {'SQLite':>10} {'PostgreSQL':>12} {'Match':>8}")
        logger.info("-" * 60)

        for model, name in tables:
            sq_count = sq.query(func.count()).select_from(model).scalar()
            pg_count = pg.query(func.count()).select_from(model).scalar()
            match = "✓" if sq_count == pg_count else "✗"
            if sq_count == pg_count:
                passed += 1
            else:
                failed += 1
            logger.info(f"{name:<20} {sq_count:>10} {pg_count:>12} {match:>8}")

        # ── Financial totals ────────────────────────────────────────────────
        logger.info("")
        logger.info("=" * 60)
        logger.info("FINANCIAL TOTALS")
        logger.info("=" * 60)

        sq_alloc = sq.query(func.sum(Allocation.allocated_amount)).scalar() or 0.0
        pg_alloc = pg.query(func.sum(Allocation.allocated_amount)).scalar() or 0.0
        match_alloc = abs(sq_alloc - pg_alloc) < 0.01
        if match_alloc:
            passed += 1
        else:
            failed += 1
        logger.info(f"Total allocated:  SQLite={sq_alloc:.2f}  PG={pg_alloc:.2f}  {'✓' if match_alloc else '✗'}")

        sq_exp = sq.query(func.sum(Expenditure.expenditure_amount)).scalar() or 0.0
        pg_exp = pg.query(func.sum(Expenditure.expenditure_amount)).scalar() or 0.0
        match_exp = abs(sq_exp - pg_exp) < 0.01
        if match_exp:
            passed += 1
        else:
            failed += 1
        logger.info(f"Total expenditure: SQLite={sq_exp:.2f}  PG={pg_exp:.2f}  {'✓' if match_exp else '✗'}")

        # ── Distinct values ─────────────────────────────────────────────────
        logger.info("")
        logger.info("=" * 60)
        logger.info("DISTINCT VALUE COUNTS")
        logger.info("=" * 60)

        checks = [
            ("Distinct MPs", func.count(func.distinct(MP.mp_id)), MP),
            ("Distinct States (MP)", func.count(func.distinct(MP.state)), MP),
            ("Distinct Work IDs", func.count(func.distinct(Work.work_id)), Work),
        ]

        for label, agg, model in checks:
            sq_val = sq.query(agg).select_from(model).scalar()
            pg_val = pg.query(agg).select_from(model).scalar()
            match = sq_val == pg_val
            if match:
                passed += 1
            else:
                failed += 1
            logger.info(f"{label:<25} SQLite={sq_val}  PG={pg_val}  {'✓' if match else '✗'}")

        # ── House / Term breakdown ──────────────────────────────────────────
        logger.info("")
        logger.info("=" * 60)
        logger.info("HOUSE / TERM BREAKDOWN (Works)")
        logger.info("=" * 60)

        for house_val in ["Lok Sabha", "Rajya Sabha"]:
            terms = [17, 18] if house_val == "Lok Sabha" else [None]
            for term in terms:
                f = Work.house == house_val
                ft = Work.ls_term == term if term is not None else Work.ls_term.is_(None)
                sq_c = sq.query(func.count(Work.id)).filter(f, ft).scalar()
                pg_c = pg.query(func.count(Work.id)).filter(f, ft).scalar()
                match = sq_c == pg_c
                if match:
                    passed += 1
                else:
                    failed += 1
                label = f"{house_val} Term {term}" if term else house_val
                logger.info(f"{label:<30} SQLite={sq_c}  PG={pg_c}  {'✓' if match else '✗'}")

        # ── Sample record verification ──────────────────────────────────────
        logger.info("")
        logger.info("=" * 60)
        logger.info("RANDOM SAMPLE VERIFICATION (5 MPs)")
        logger.info("=" * 60)

        sample_mps = sq.query(MP).limit(5).all()
        for mp in sample_mps:
            pg_mp = pg.query(MP).filter(MP.mp_id == mp.mp_id).first()
            if pg_mp and pg_mp.name == mp.name and pg_mp.house == mp.house and pg_mp.state == mp.state:
                passed += 1
                logger.info(f"  ✓ {mp.mp_id}: {mp.name} ({mp.house}, {mp.state})")
            else:
                failed += 1
                logger.info(f"  ✗ {mp.mp_id}: MISMATCH or MISSING")

    logger.info("")
    logger.info("=" * 60)
    logger.info(f"VALIDATION COMPLETE: {passed} passed, {failed} failed")
    logger.info("=" * 60)

    if failed > 0:
        logger.error("MIGRATION VALIDATION FAILED — investigate before going live.")
        sys.exit(1)
    else:
        logger.info("ALL CHECKS PASSED — migration is valid.")


if __name__ == "__main__":
    validate()
