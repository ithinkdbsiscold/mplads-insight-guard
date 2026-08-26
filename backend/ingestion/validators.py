"""
MPLADS Guardian — Data Validators

Validates normalised records before database insertion.
Produces a structured validation report stored to disk.

Validation rules derived from reference-analysis.md:
  - mp_name:  non-empty string, length > 1
  - house:    "Lok Sabha" or "Rajya Sabha"
  - state:    non-empty string, length > 1
  - ls_term:  17 or 18 for LS; None for RS; no mixing
  - amounts:  non-negative float
  - work_id:  positive integer
  - has_image: boolean
  - average_rating: 0–5 float or None
  - dates:    YYYY-MM-DD or None
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

VALID_HOUSES = {"Lok Sabha", "Rajya Sabha"}
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


# ---------------------------------------------------------------------------
# Per-record validation
# ---------------------------------------------------------------------------

def _validate_common(record: dict) -> list[str]:
    errors: list[str] = []
    mp = str(record.get("mp_name", "")).strip()
    if not mp or len(mp) <= 1:
        errors.append("missing_or_short_mp_name")
    house = record.get("house")
    if house not in VALID_HOUSES:
        errors.append(f"invalid_house:{house!r}")
    state = str(record.get("state", "")).strip()
    if not state or len(state) <= 1:
        errors.append("missing_or_short_state")
    return errors


def _validate_ls_term(record: dict) -> list[str]:
    errors: list[str] = []
    house = record.get("house")
    ls_term = record.get("ls_term")
    if house == "Lok Sabha":
        if ls_term not in (17, 18):
            errors.append(f"invalid_ls_term_for_lok_sabha:{ls_term!r}")
    elif house == "Rajya Sabha":
        if ls_term is not None:
            errors.append(f"ls_term_should_be_null_for_rajya_sabha:{ls_term!r}")
    return errors


def _validate_amount(value: Any, field_name: str) -> list[str]:
    if not isinstance(value, (int, float)) or value < 0:
        return [f"invalid_{field_name}:{value!r}"]
    return []


def _validate_date(value: Any, field_name: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, str) or not DATE_PATTERN.match(value):
        return [f"malformed_{field_name}:{value!r}"]
    try:
        date.fromisoformat(value)
    except ValueError:
        return [f"invalid_{field_name}:{value!r}"]
    return []


def validate_allocation(r: dict) -> list[str]:
    errors = _validate_common(r) + _validate_ls_term(r)
    errors += _validate_amount(r.get("allocated_amount"), "allocated_amount")
    return errors


def validate_expenditure(r: dict) -> list[str]:
    errors = _validate_common(r) + _validate_ls_term(r)
    errors += _validate_amount(r.get("expenditure_amount"), "expenditure_amount")
    errors += _validate_date(r.get("expenditure_date"), "expenditure_date")
    return errors


def validate_work_completed(r: dict) -> list[str]:
    errors = _validate_common(r) + _validate_ls_term(r)
    wid = r.get("work_id")
    if not isinstance(wid, int) or wid <= 0:
        errors.append(f"invalid_work_id:{wid!r}")
    errors += _validate_amount(r.get("final_amount"), "final_amount")
    errors += _validate_date(r.get("completion_date"), "completion_date")
    if not isinstance(r.get("has_image"), bool):
        errors.append("has_image_must_be_bool")
    avg = r.get("average_rating")
    if avg is not None:
        if not isinstance(avg, (int, float)) or not (0 <= avg <= 5):
            errors.append(f"invalid_average_rating:{avg!r}")
    return errors


def validate_work_recommended(r: dict) -> list[str]:
    errors = _validate_common(r) + _validate_ls_term(r)
    wid = r.get("work_id")
    if not isinstance(wid, int) or wid <= 0:
        errors.append(f"invalid_work_id:{wid!r}")
    errors += _validate_amount(r.get("recommended_amount"), "recommended_amount")
    errors += _validate_date(r.get("recommendation_date"), "recommendation_date")
    return errors


# ---------------------------------------------------------------------------
# Batch validation
# ---------------------------------------------------------------------------

VALIDATORS = {
    "allocations": validate_allocation,
    "expenditures": validate_expenditure,
    "works_completed": validate_work_completed,
    "works_recommended": validate_work_recommended,
}


@dataclass
class BatchResult:
    data_type: str
    total: int = 0
    valid: int = 0
    invalid: int = 0
    error_counts: dict[str, int] = field(default_factory=dict)
    valid_records: list[dict] = field(default_factory=list, repr=False)


def validate_batch(records: list[dict], data_type: str) -> BatchResult:
    validator = VALIDATORS[data_type]
    result = BatchResult(data_type=data_type, total=len(records))

    for rec in records:
        errors = validator(rec)
        if not errors:
            result.valid += 1
            result.valid_records.append(rec)
        else:
            result.invalid += 1
            for e in errors:
                result.error_counts[e] = result.error_counts.get(e, 0) + 1

    if result.invalid:
        top = sorted(result.error_counts.items(), key=lambda x: -x[1])[:5]
        logger.warning(
            "%s: %d/%d invalid. Top errors: %s",
            data_type, result.invalid, result.total, top
        )
    return result


# ---------------------------------------------------------------------------
# Full validation + report
# ---------------------------------------------------------------------------

@dataclass
class ValidationReport:
    total: int = 0
    valid: int = 0
    invalid: int = 0
    data_quality_pct: float = 100.0
    by_type: dict[str, dict] = field(default_factory=dict)


def validate_all(
    data: dict[str, list[dict]],
    report_dir: Optional[Path] = None,
) -> tuple[dict[str, list[dict]], ValidationReport]:
    """
    Validate all data types.

    Args:
        data:       { "allocations": [...], "expenditures": [...], ... }
        report_dir: if given, writes validation_report.json here

    Returns:
        (validated_data, report)
    """
    logger.info("Validating transformed records...")
    report = ValidationReport()
    validated: dict[str, list[dict]] = {}

    for dt in ("allocations", "expenditures", "works_completed", "works_recommended"):
        records = data.get(dt, [])
        result = validate_batch(records, dt)
        validated[dt] = result.valid_records
        report.total   += result.total
        report.valid   += result.valid
        report.invalid += result.invalid
        report.by_type[dt] = {
            "total":   result.total,
            "valid":   result.valid,
            "invalid": result.invalid,
            "error_counts": result.error_counts,
        }

    if report.total:
        report.data_quality_pct = round((report.valid / report.total) * 100, 2)

    logger.info(
        "Validation complete: %d/%d valid (%.1f%%)",
        report.valid, report.total, report.data_quality_pct
    )

    if report_dir:
        report_dir.mkdir(parents=True, exist_ok=True)
        report_path = report_dir / "validation_report.json"
        report_path.write_text(
            json.dumps(
                {
                    "total": report.total,
                    "valid": report.valid,
                    "invalid": report.invalid,
                    "data_quality_pct": report.data_quality_pct,
                    "by_type": report.by_type,
                },
                indent=2,
            ),
            encoding="utf-8"
        )
        logger.info("Validation report saved to %s", report_path)

    return validated, report
