"""
MPLADS Guardian — Data Transformers

Converts raw eSAKSHI API records into normalised Guardian schema dicts.

Every field mapping is backed by an observed source field from the reference analysis.
No fields are invented. If a source field is absent, the target field is None.

Key helpers:
  parse_indian_number  — handles ₹, commas, lakh/crore suffixes
  parse_date           — DD-MMM-YYYY → YYYY-MM-DD
  clean_text           — removes garbled encoding
  normalise_constituency — strips state codes and caste suffixes
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Primitive parsers
# ---------------------------------------------------------------------------

MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "sept": "09", "oct": "10", "nov": "11", "dec": "12",
}


def parse_indian_number(raw: Any) -> float:
    """
    Parse an Indian-format number string to a float.

    Handles: ₹ symbol, unicode spaces, commas, lakh/crore unit suffixes.
    Returns 0.0 for null / N/A / empty values.
    """
    if raw is None:
        return 0.0
    s = str(raw).strip()
    if not s or re.match(r"^(-|N/A|null|undefined|--)$", s, re.I):
        return 0.0

    # Strip currency symbol and all whitespace variants
    s = re.sub(r"₹", "", s)
    s = re.sub(r"[\u00A0\u202F\u2009\u200A\u200B\s]", "", s)
    s = s.replace(",", "")

    m = re.search(r"([0-9]+(?:\.[0-9]+)?)", s)
    if not m:
        return 0.0

    num = float(m.group(1))
    suffix = s[m.end():].lower()

    if re.search(r"(cr|crore|crores)", suffix):
        num *= 10_000_000
    elif re.search(r"(lac|lakh|lakhs)", suffix):
        num *= 100_000

    return num if num == num else 0.0  # NaN guard


def parse_date(raw: Any) -> Optional[str]:
    """
    Parse a date string to ISO YYYY-MM-DD format.

    Accepts DD-MMM-YYYY (API format) and ISO fallback.
    Returns None if absent or unparseable.
    """
    if not raw:
        return None
    s = str(raw).strip()
    if not s or s.upper() in ("N/A", "NULL", "NONE", "--"):
        return None

    # DD-MMM-YYYY e.g. "15-Aug-2024"
    if "-" in s:
        parts = s.split("-")
        if len(parts) == 3:
            day_str, month_token, year_str = parts
            month = MONTH_MAP.get(month_token[:4].lower())
            if month and year_str.isdigit() and day_str.isdigit():
                day = day_str.zfill(2)
                try:
                    datetime(int(year_str), int(month), int(day))
                    return f"{year_str}-{month}-{day}"
                except ValueError:
                    pass

    # ISO fallback
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        pass

    return None


def clean_text(raw: Any) -> str:
    """Remove garbled UTF-8 sequences (e.g. long runs of '?') and strip whitespace."""
    if not raw:
        return ""
    return re.sub(r"\?{3,}", "", str(raw)).strip()


def normalise_constituency(raw: Any) -> str:
    """
    Normalise a constituency name:
    - Remove trailing state code suffixes (_BR, _MH, etc.)
    - Remove reservation qualifiers (SC), (ST), " - SC", etc.
    - Collapse extra whitespace
    """
    if not raw:
        return ""
    c = str(raw).strip()
    c = re.sub(r"_[A-Z]{2,3}$", "", c)
    c = re.sub(r"\s*\((SC|ST|GEN|S\.?C\.?|S\.?T\.?)\)\s*$", "", c, flags=re.I)
    c = re.sub(r"\s*[-\u2013]\s*(SC|ST|GEN)\s*$", "", c, flags=re.I)
    c = re.sub(r"\s+", " ", c).strip()
    return c


# ---------------------------------------------------------------------------
# Row guard — skip summary/total rows and rows missing mandatory fields
# ---------------------------------------------------------------------------

def _is_valid_row(record: dict) -> bool:
    state = str(record.get("STATE_NAME", "")).strip()
    mp_name = str(record.get("MP_NAME", "")).strip()
    if not state or not mp_name or len(state) <= 1 or len(mp_name) <= 1:
        return False
    lower_state = state.lower()
    lower_mp = mp_name.lower()
    if "total" in lower_state or "total" in lower_mp or "grand" in lower_state:
        return False
    return True


# ---------------------------------------------------------------------------
# Transformers — one per data type
# ---------------------------------------------------------------------------

def transform_allocated_limit(
    raw_records: list[dict],
    house: str,
    ls_term: Optional[int],
    fetched_at: str,
    source_combo: str,
) -> list[dict]:
    """
    Transform raw Allocated Limit records.

    Source fields used:
      STATE_NAME, MP_NAME, CONSTITUENCY, ALLOCATED_AMT, Sno
    """
    results = []
    for i, r in enumerate(raw_records):
        if not _is_valid_row(r):
            continue
        results.append({
            "sr_no": r.get("Sno", i + 1),
            "state": str(r.get("STATE_NAME", "")).strip(),
            "mp_name": str(r.get("MP_NAME", "")).strip(),
            "constituency": normalise_constituency(r.get("CONSTITUENCY")),
            "allocated_amount": parse_indian_number(r.get("ALLOCATED_AMT")),
            "house": house,
            "ls_term": ls_term,
            # provenance
            "fetched_at": fetched_at,
            "source_combo": source_combo,
            "source_key": "Allocated Limit for Hon'ble MPs",
        })
    return results


def transform_expenditure(
    raw_records: list[dict],
    house: str,
    ls_term: Optional[int],
    fetched_at: str,
    source_combo: str,
) -> list[dict]:
    """
    Transform raw Expenditure records.

    Source fields used:
      STATE_NAME, MP_NAME, CONSTITUENCY, WORK_RECOMMENDATION_DTL_ID,
      ACTIVITY_NAME, VENDOR_NAME, IDA_NAME / IA_NAME,
      EXPENDITURE_DATE, WORK_STATUS / PAYMENT_STATUS,
      FUND_DISBURSED_AMT / EXPENDITURE_AMOUNT
    """
    results = []
    for i, r in enumerate(raw_records):
        if not _is_valid_row(r):
            continue
        work_id_raw = r.get("WORK_RECOMMENDATION_DTL_ID")
        work_id = int(work_id_raw) if work_id_raw else 0
        results.append({
            "sr_no": r.get("Sno", i + 1),
            "state": str(r.get("STATE_NAME", "")).strip(),
            "mp_name": str(r.get("MP_NAME", "")).strip(),
            "constituency": normalise_constituency(r.get("CONSTITUENCY")),
            "work_id": work_id,
            "work_description": clean_text(r.get("ACTIVITY_NAME")),
            "vendor": r.get("VENDOR_NAME") or None,
            # API uses both IDA_NAME and IA_NAME
            "implementing_agency": r.get("IDA_NAME") or r.get("IA_NAME") or None,
            "expenditure_date": parse_date(r.get("EXPENDITURE_DATE")),
            # API uses both WORK_STATUS and PAYMENT_STATUS
            "payment_status": r.get("WORK_STATUS") or r.get("PAYMENT_STATUS") or "N/A",
            # API uses both FUND_DISBURSED_AMT and EXPENDITURE_AMOUNT
            "expenditure_amount": parse_indian_number(
                r.get("FUND_DISBURSED_AMT") or r.get("EXPENDITURE_AMOUNT")
            ),
            "house": house,
            "ls_term": ls_term,
            # provenance
            "fetched_at": fetched_at,
            "source_combo": source_combo,
            "source_key": "Expenditure on Completed and On-going Works as on Date",
        })
    return results


def transform_works_completed(
    raw_records: list[dict],
    house: str,
    ls_term: Optional[int],
    fetched_at: str,
    source_combo: str,
) -> list[dict]:
    """
    Transform raw Works Completed records.

    Filter rules:
    - Must have ACTUAL_END_DATE and ACTUAL_AMOUNT
    - Must have a positive WORK_RECOMMENDATION_DTL_ID

    Source fields used:
      STATE_NAME, MP_NAME, CONSTITUENCY, WORK_RECOMMENDATION_DTL_ID,
      WORK_CATEGORY, IDA_NAME, WORK_DESCRIPTION / ACTIVITY_NAME,
      ACTUAL_END_DATE, FILE_STATUS, AVERAGE_RATING, ACTUAL_AMOUNT
    """
    results = []
    for i, r in enumerate(raw_records):
        if not _is_valid_row(r):
            continue
        if not r.get("ACTUAL_END_DATE") or not r.get("ACTUAL_AMOUNT"):
            continue
        work_id_raw = r.get("WORK_RECOMMENDATION_DTL_ID")
        try:
            work_id = int(work_id_raw)
        except (TypeError, ValueError):
            continue
        if work_id <= 0:
            continue

        # Average rating: coerce "N/A" to None
        avg_raw = r.get("AVERAGE_RATING")
        try:
            avg_rating = float(avg_raw) if avg_raw not in (None, "N/A") else None
        except (TypeError, ValueError):
            avg_rating = None

        results.append({
            "sr_no": r.get("Sno", i + 1),
            "state": str(r.get("STATE_NAME", "")).strip(),
            "mp_name": str(r.get("MP_NAME", "")).strip(),
            "constituency": normalise_constituency(r.get("CONSTITUENCY")),
            "work_id": work_id,
            "work_category": r.get("WORK_CATEGORY") or None,
            "implementing_agency": r.get("IDA_NAME") or None,
            "work_description": (
                clean_text(r.get("WORK_DESCRIPTION"))
                or clean_text(r.get("ACTIVITY_NAME"))
                or "No description"
            ),
            "completion_date": parse_date(r.get("ACTUAL_END_DATE")),
            "has_image": r.get("FILE_STATUS") in (True, "true", "True"),
            "average_rating": avg_rating,
            "final_amount": parse_indian_number(r.get("ACTUAL_AMOUNT")),
            "house": house,
            "ls_term": ls_term,
            # provenance
            "fetched_at": fetched_at,
            "source_combo": source_combo,
            "source_key": "Works Completed",
        })
    return results


def transform_works_recommended(
    raw_records: list[dict],
    house: str,
    ls_term: Optional[int],
    fetched_at: str,
    source_combo: str,
    completed_work_ids: Optional[set[int]] = None,
) -> list[dict]:
    """
    Transform raw Works Recommended records.

    Filter rules:
    - Must have RECOMMENDATION_DATE and RECOMMENDED_AMOUNT
    - Must have a positive WORK_RECOMMENDATION_DTL_ID
    - Exclude if work_id already in completed_work_ids (cross-collection dedup)

    Source fields used:
      STATE_NAME, MP_NAME, CONSTITUENCY, WORK_RECOMMENDATION_DTL_ID,
      WORK_CATEGORY, IDA_NAME, WORK_DESCRIPTION / ACTIVITY_NAME,
      RECOMMENDATION_DATE, FILE_STATUS, RECOMMENDED_AMOUNT
    """
    completed_work_ids = completed_work_ids or set()
    results = []
    excluded = 0

    for i, r in enumerate(raw_records):
        if not _is_valid_row(r):
            continue
        if not r.get("RECOMMENDATION_DATE") or not r.get("RECOMMENDED_AMOUNT"):
            continue
        work_id_raw = r.get("WORK_RECOMMENDATION_DTL_ID")
        try:
            work_id = int(work_id_raw)
        except (TypeError, ValueError):
            continue
        if work_id <= 0:
            continue

        # Cross-collection deduplication
        if work_id in completed_work_ids:
            excluded += 1
            continue

        results.append({
            "sr_no": r.get("Sno", i + 1),
            "state": str(r.get("STATE_NAME", "")).strip(),
            "mp_name": str(r.get("MP_NAME", "")).strip(),
            "constituency": normalise_constituency(r.get("CONSTITUENCY")),
            "work_id": work_id,
            "work_category": r.get("WORK_CATEGORY") or None,
            "implementing_agency": r.get("IDA_NAME") or None,
            "work_description": (
                clean_text(r.get("WORK_DESCRIPTION"))
                or clean_text(r.get("ACTIVITY_NAME"))
                or "No description"
            ),
            "recommendation_date": parse_date(r.get("RECOMMENDATION_DATE")),
            "has_image": r.get("FILE_STATUS") in (True, "true", "True"),
            "recommended_amount": parse_indian_number(r.get("RECOMMENDED_AMOUNT")),
            "house": house,
            "ls_term": ls_term,
            # provenance
            "fetched_at": fetched_at,
            "source_combo": source_combo,
            "source_key": "Works Recommended",
        })

    if excluded:
        import logging
        logging.getLogger(__name__).info(
            "Excluded %d recommended works already in completed set", excluded
        )
    return results


# ---------------------------------------------------------------------------
# Top-level orchestrator
# ---------------------------------------------------------------------------

def transform_all(raw_data: dict) -> dict:
    """
    Transform the complete raw API fetch result.

    Args:
        raw_data: output of EsakshiClient.fetch_all()

    Returns:
        {
            "allocations": [...],
            "expenditures": [...],
            "works_completed": [...],
            "works_recommended": [...],
        }
    """
    import logging
    log = logging.getLogger(__name__)
    log.info("Transforming raw API data...")

    fetch_time = raw_data.get("metadata", {}).get("fetch_time", "")
    opt = raw_data.get("metadata", {}).get("ls_term_option", "both")

    from .mplads_client import COMBO

    allocations: list[dict] = []
    expenditures: list[dict] = []
    works_completed: list[dict] = []
    works_recommended: list[dict] = []

    # ── Lok Sabha 18th ──────────────────────────────────────────────────────
    if opt in ("18", "both"):
        combo = COMBO[("lok_sabha", "18")]
        ls18 = raw_data.get("lok_sabha_18", {})
        alloc18 = transform_allocated_limit(ls18.get("allocated_limit", []), "Lok Sabha", 18, fetch_time, combo)
        exp18   = transform_expenditure(ls18.get("expenditure", []), "Lok Sabha", 18, fetch_time, combo)
        comp18  = transform_works_completed(ls18.get("works_completed", []), "Lok Sabha", 18, fetch_time, combo)
        comp18_ids = {w["work_id"] for w in comp18}
        rec18   = transform_works_recommended(ls18.get("works_recommended", []), "Lok Sabha", 18, fetch_time, combo, comp18_ids)
        log.info("LS18 — alloc=%d exp=%d comp=%d rec=%d", len(alloc18), len(exp18), len(comp18), len(rec18))
        allocations += alloc18; expenditures += exp18
        works_completed += comp18; works_recommended += rec18

    # ── Lok Sabha 17th ──────────────────────────────────────────────────────
    if opt in ("17", "both"):
        combo = COMBO[("lok_sabha", "17")]
        ls17 = raw_data.get("lok_sabha_17", {})
        alloc17 = transform_allocated_limit(ls17.get("allocated_limit", []), "Lok Sabha", 17, fetch_time, combo)
        exp17   = transform_expenditure(ls17.get("expenditure", []), "Lok Sabha", 17, fetch_time, combo)
        comp17  = transform_works_completed(ls17.get("works_completed", []), "Lok Sabha", 17, fetch_time, combo)
        comp17_ids = {w["work_id"] for w in comp17}
        rec17   = transform_works_recommended(ls17.get("works_recommended", []), "Lok Sabha", 17, fetch_time, combo, comp17_ids)
        log.info("LS17 — alloc=%d exp=%d comp=%d rec=%d", len(alloc17), len(exp17), len(comp17), len(rec17))
        allocations += alloc17; expenditures += exp17
        works_completed += comp17; works_recommended += rec17

    # ── Rajya Sabha ─────────────────────────────────────────────────────────
    combo_rs = COMBO[("rajya_sabha", None)]
    rs = raw_data.get("rajya_sabha", {})
    alloc_rs = transform_allocated_limit(rs.get("allocated_limit", []), "Rajya Sabha", None, fetch_time, combo_rs)
    exp_rs   = transform_expenditure(rs.get("expenditure", []), "Rajya Sabha", None, fetch_time, combo_rs)
    comp_rs  = transform_works_completed(rs.get("works_completed", []), "Rajya Sabha", None, fetch_time, combo_rs)
    comp_rs_ids = {w["work_id"] for w in comp_rs}
    rec_rs   = transform_works_recommended(rs.get("works_recommended", []), "Rajya Sabha", None, fetch_time, combo_rs, comp_rs_ids)
    log.info("RS  — alloc=%d exp=%d comp=%d rec=%d", len(alloc_rs), len(exp_rs), len(comp_rs), len(rec_rs))
    allocations += alloc_rs; expenditures += exp_rs
    works_completed += comp_rs; works_recommended += rec_rs

    log.info(
        "Transformation complete: alloc=%d exp=%d comp=%d rec=%d",
        len(allocations), len(expenditures), len(works_completed), len(works_recommended),
    )
    return {
        "allocations": allocations,
        "expenditures": expenditures,
        "works_completed": works_completed,
        "works_recommended": works_recommended,
    }
