"""
MPLADS Guardian — Deduplication

In-batch deduplication before database storage.

Deduplication keys:
  Works Completed:   (house, ls_term, state, work_id)  → keep latest completion_date
  Works Recommended: (house, ls_term, state, work_id)  → keep latest rec date, then largest amount
  Expenditures:      exact row key to drop true duplicates only
  Allocations:       (house, ls_term, mp_name_lower, constituency_lower) → keep largest amount

MP extraction:
  Unique MPs derived from allocations.
  Identity key: lower(mp_name) + house + lower(constituency)
  (Not ls_term — same person may appear in multiple terms.)

Deterministic MP ID:
  mp_id = sha256(lower(mp_name) + "|" + house + "|" + lower(constituency))[:16]
  This is stable across ingestion runs and does not depend on insertion order.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _term_str(ls_term: Optional[int]) -> str:
    return str(ls_term) if ls_term is not None else "null"


# ---------------------------------------------------------------------------
# Works Completed
# ---------------------------------------------------------------------------

def deduplicate_works_completed(
    records: list[dict],
) -> list[dict]:
    """Keep the record with the latest completion_date per (house, ls_term, state, work_id)."""
    seen: dict[tuple, dict] = {}
    for rec in records:
        key = (rec["house"], rec.get("ls_term"), rec["state"], rec["work_id"])
        existing = seen.get(key)
        if not existing:
            seen[key] = rec
        else:
            a = existing.get("completion_date") or ""
            b = rec.get("completion_date") or ""
            if b > a:
                seen[key] = rec

    removed = len(records) - len(seen)
    if removed:
        logger.info("works_completed: removed %d in-batch duplicates", removed)
    return list(seen.values())


# ---------------------------------------------------------------------------
# Works Recommended
# ---------------------------------------------------------------------------

def deduplicate_works_recommended(
    records: list[dict],
) -> list[dict]:
    """Keep record with latest recommendation_date (break ties by largest amount)."""
    seen: dict[tuple, dict] = {}
    for rec in records:
        key = (rec["house"], rec.get("ls_term"), rec["state"], rec["work_id"])
        existing = seen.get(key)
        if not existing:
            seen[key] = rec
        else:
            a_date = existing.get("recommendation_date") or ""
            b_date = rec.get("recommendation_date") or ""
            if b_date > a_date:
                seen[key] = rec
            elif b_date == a_date:
                if (rec.get("recommended_amount") or 0) >= (existing.get("recommended_amount") or 0):
                    seen[key] = rec

    removed = len(records) - len(seen)
    if removed:
        logger.info("works_recommended: removed %d in-batch duplicates", removed)
    return list(seen.values())


# ---------------------------------------------------------------------------
# Expenditures
# ---------------------------------------------------------------------------

def deduplicate_expenditures(records: list[dict]) -> list[dict]:
    """Remove exact duplicate expenditure rows (same work_id + date + amount + status)."""
    seen: dict[tuple, dict] = {}
    for rec in records:
        key = (
            rec["house"],
            rec.get("ls_term"),
            rec["state"],
            rec.get("work_id"),
            rec.get("expenditure_date"),
            rec.get("payment_status"),
            rec.get("expenditure_amount"),
        )
        seen.setdefault(key, rec)

    removed = len(records) - len(seen)
    if removed:
        logger.info("expenditures: removed %d exact duplicates", removed)
    return list(seen.values())


# ---------------------------------------------------------------------------
# Allocations
# ---------------------------------------------------------------------------

def deduplicate_allocations(records: list[dict]) -> list[dict]:
    """Keep the record with the largest allocated_amount per MP/constituency/house/term."""
    seen: dict[tuple, dict] = {}
    for rec in records:
        key = (
            rec["house"],
            rec.get("ls_term"),
            rec["mp_name"].strip().lower(),
            rec["constituency"].strip().lower(),
        )
        existing = seen.get(key)
        if not existing:
            seen[key] = rec
        elif (rec.get("allocated_amount") or 0) > (existing.get("allocated_amount") or 0):
            seen[key] = rec

    removed = len(records) - len(seen)
    if removed:
        logger.info("allocations: removed %d duplicates", removed)
    return list(seen.values())


# ---------------------------------------------------------------------------
# MP extraction
# ---------------------------------------------------------------------------

def _make_mp_id(mp_name: str, house: str, constituency: str) -> str:
    """
    Generate a deterministic MP identifier.

    Formula: sha256(lower(mp_name) + "|" + house + "|" + lower(constituency))[:16]

    This is stable across runs and not dependent on insertion order.
    It will collide only if two MPs share the exact same name, house, and constituency,
    which is considered an acceptable degenerate case for a hackathon system.
    """
    raw = f"{mp_name.strip().lower()}|{house}|{constituency.strip().lower()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def extract_mps(allocations: list[dict]) -> list[dict]:
    """
    Extract unique MP entities from the allocation records.

    MP identity: lower(mp_name) + house + lower(constituency)
    (Not ls_term — same MP may appear in multiple terms.)
    """
    seen: dict[str, dict] = {}
    for a in allocations:
        mp_name = a["mp_name"].strip()
        house = a["house"]
        constituency = a["constituency"]
        entity_key = f"{mp_name.lower()}|{house}|{constituency.lower()}"
        if entity_key not in seen:
            seen[entity_key] = {
                "mp_id": _make_mp_id(mp_name, house, constituency),
                "name": mp_name,
                "house": house,
                "state": a["state"],
                "constituency": constituency,
                "entity_key": entity_key,
            }
    return list(seen.values())


# ---------------------------------------------------------------------------
# Top-level
# ---------------------------------------------------------------------------

def deduplicate_all(data: dict[str, list[dict]]) -> dict[str, list[dict]]:
    """Run all deduplication passes and return cleaned data."""
    logger.info("Running in-batch deduplication...")
    return {
        "allocations":      deduplicate_allocations(data.get("allocations", [])),
        "expenditures":     deduplicate_expenditures(data.get("expenditures", [])),
        "works_completed":  deduplicate_works_completed(data.get("works_completed", [])),
        "works_recommended": deduplicate_works_recommended(data.get("works_recommended", [])),
    }
