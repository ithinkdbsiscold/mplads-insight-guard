"""
MPLADS Guardian — Test Suite

Tests cover:
  - Indian number parsing
  - Date parsing
  - Constituency normalisation
  - Row guard (skip invalid/total rows)
  - Transformer field mappings
  - House / ls_term handling
  - Cross-collection deduplication (recommended excludes completed work_ids)
  - In-batch deduplication rules
  - Validator rules per data type
  - MP ID determinism
  - API client response extraction (mocked — no live API calls)

All tests use static fixtures. No network access is needed.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure backend root is on path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from ingestion.transformers import (
    parse_indian_number,
    parse_date,
    clean_text,
    normalise_constituency,
    transform_allocated_limit,
    transform_expenditure,
    transform_works_completed,
    transform_works_recommended,
)
from ingestion.validators import (
    validate_allocation,
    validate_expenditure,
    validate_work_completed,
    validate_work_recommended,
    validate_batch,
)
from ingestion.deduplication import (
    deduplicate_works_completed,
    deduplicate_works_recommended,
    deduplicate_allocations,
    extract_mps,
    _make_mp_id,
)


# ---------------------------------------------------------------------------
# Fixtures — mocked API records
# ---------------------------------------------------------------------------

FETCH_TIME = "2026-08-26T08:00:00Z"
LS18_COMBO = "0,0,0,2,7"
LS17_COMBO = "0,0,0,2,5"
RS_COMBO   = "0,0,0,1"


def _alloc_raw(mp="RAHUL GANDHI", state="KERALA", const="WAYANAD", amt="500000") -> dict:
    return {
        "Sno": 1, "STATE_NAME": state, "MP_NAME": mp,
        "CONSTITUENCY": const, "ALLOCATED_AMT": amt,
    }


def _exp_raw(mp="RAHUL GANDHI", work_id="123", amt="100000") -> dict:
    return {
        "Sno": 1, "STATE_NAME": "KERALA", "MP_NAME": mp,
        "CONSTITUENCY": "WAYANAD", "WORK_RECOMMENDATION_DTL_ID": work_id,
        "ACTIVITY_NAME": "Building a school", "VENDOR_NAME": "ACME Corp",
        "IDA_NAME": "PWD", "EXPENDITURE_DATE": "15-Aug-2024",
        "WORK_STATUS": "Payment Success", "FUND_DISBURSED_AMT": amt,
    }


def _comp_raw(work_id="123", amt="120000") -> dict:
    return {
        "Sno": 1, "STATE_NAME": "KERALA", "MP_NAME": "RAHUL GANDHI",
        "CONSTITUENCY": "WAYANAD", "WORK_RECOMMENDATION_DTL_ID": work_id,
        "WORK_CATEGORY": "Education", "IDA_NAME": "PWD",
        "WORK_DESCRIPTION": "Building a school", "ACTUAL_END_DATE": "20-Aug-2024",
        "FILE_STATUS": True, "AVERAGE_RATING": "4.5", "ACTUAL_AMOUNT": amt,
    }


def _rec_raw(work_id="456", amt="80000", date="10-Jan-2024") -> dict:
    return {
        "Sno": 1, "STATE_NAME": "KERALA", "MP_NAME": "RAHUL GANDHI",
        "CONSTITUENCY": "WAYANAD", "WORK_RECOMMENDATION_DTL_ID": work_id,
        "WORK_CATEGORY": "Health", "IDA_NAME": "PHD",
        "WORK_DESCRIPTION": "Building a clinic", "RECOMMENDATION_DATE": date,
        "FILE_STATUS": False, "RECOMMENDED_AMOUNT": amt,
    }


# ============================================================================
# PARSE_INDIAN_NUMBER
# ============================================================================

class TestParseIndianNumber:
    def test_plain_integer(self):
        assert parse_indian_number("500000") == 500000.0

    def test_with_commas(self):
        assert parse_indian_number("5,00,000") == 500000.0

    def test_rupee_symbol(self):
        assert parse_indian_number("₹5,00,000") == 500000.0

    def test_lakh_suffix(self):
        assert parse_indian_number("5 Lakh") == pytest.approx(500000.0)

    def test_crore_suffix(self):
        assert parse_indian_number("1 Crore") == pytest.approx(10_000_000.0)

    def test_none(self):
        assert parse_indian_number(None) == 0.0

    def test_na(self):
        assert parse_indian_number("N/A") == 0.0

    def test_empty(self):
        assert parse_indian_number("") == 0.0

    def test_float_string(self):
        assert parse_indian_number("1234.56") == pytest.approx(1234.56)


# ============================================================================
# PARSE_DATE
# ============================================================================

class TestParseDate:
    def test_dd_mmm_yyyy(self):
        assert parse_date("15-Aug-2024") == "2024-08-15"

    def test_dd_jan_yyyy(self):
        assert parse_date("01-Jan-2020") == "2020-01-01"

    def test_iso_passthrough(self):
        assert parse_date("2024-08-15") == "2024-08-15"

    def test_none(self):
        assert parse_date(None) is None

    def test_na(self):
        assert parse_date("N/A") is None

    def test_empty(self):
        assert parse_date("") is None

    def test_invalid(self):
        assert parse_date("not-a-date") is None


# ============================================================================
# NORMALISE_CONSTITUENCY
# ============================================================================

class TestNormaliseConstituency:
    def test_strips_state_code(self):
        assert normalise_constituency("WAYANAD_KL") == "WAYANAD"

    def test_strips_sc_suffix(self):
        assert normalise_constituency("RAMPUR (SC)") == "RAMPUR"

    def test_strips_st_suffix(self):
        assert normalise_constituency("RANCHI - ST") == "RANCHI"

    def test_unchanged(self):
        assert normalise_constituency("WAYANAD") == "WAYANAD"

    def test_none(self):
        assert normalise_constituency(None) == ""


# ============================================================================
# TRANSFORM — Allocated Limit
# ============================================================================

class TestTransformAllocatedLimit:
    def test_basic_mapping(self):
        records = transform_allocated_limit(
            [_alloc_raw()], "Lok Sabha", 18, FETCH_TIME, LS18_COMBO
        )
        assert len(records) == 1
        r = records[0]
        assert r["mp_name"] == "RAHUL GANDHI"
        assert r["state"] == "KERALA"
        assert r["constituency"] == "WAYANAD"
        assert r["allocated_amount"] == 500000.0
        assert r["house"] == "Lok Sabha"
        assert r["ls_term"] == 18

    def test_rajya_sabha_has_null_ls_term(self):
        records = transform_allocated_limit(
            [_alloc_raw()], "Rajya Sabha", None, FETCH_TIME, RS_COMBO
        )
        assert records[0]["ls_term"] is None

    def test_filters_total_row(self):
        raw = [_alloc_raw(), {"STATE_NAME": "Grand Total", "MP_NAME": "Total", "ALLOCATED_AMT": "0"}]
        records = transform_allocated_limit(raw, "Lok Sabha", 18, FETCH_TIME, LS18_COMBO)
        assert len(records) == 1

    def test_empty_input(self):
        assert transform_allocated_limit([], "Lok Sabha", 18, FETCH_TIME, LS18_COMBO) == []


# ============================================================================
# TRANSFORM — Works Completed
# ============================================================================

class TestTransformWorksCompleted:
    def test_basic_mapping(self):
        records = transform_works_completed(
            [_comp_raw()], "Lok Sabha", 18, FETCH_TIME, LS18_COMBO
        )
        assert len(records) == 1
        r = records[0]
        assert r["work_id"] == 123
        assert r["final_amount"] == 120000.0
        assert r["has_image"] is True
        assert r["average_rating"] == pytest.approx(4.5)
        assert r["completion_date"] == "2024-08-20"

    def test_filters_missing_amount(self):
        raw = {**_comp_raw()}
        del raw["ACTUAL_AMOUNT"]
        records = transform_works_completed([raw], "Lok Sabha", 18, FETCH_TIME, LS18_COMBO)
        assert len(records) == 0

    def test_filters_invalid_work_id(self):
        raw = {**_comp_raw(), "WORK_RECOMMENDATION_DTL_ID": "0"}
        records = transform_works_completed([raw], "Lok Sabha", 18, FETCH_TIME, LS18_COMBO)
        assert len(records) == 0


# ============================================================================
# TRANSFORM — Works Recommended (cross-collection deduplication)
# ============================================================================

class TestTransformWorksRecommended:
    def test_basic_mapping(self):
        records = transform_works_recommended(
            [_rec_raw()], "Lok Sabha", 18, FETCH_TIME, LS18_COMBO
        )
        assert len(records) == 1
        r = records[0]
        assert r["work_id"] == 456
        assert r["recommended_amount"] == 80000.0
        assert r["recommendation_date"] == "2024-01-10"

    def test_excludes_completed_work_ids(self):
        """If work_id is already in completed set, it must NOT appear in recommended."""
        records = transform_works_recommended(
            [_rec_raw(work_id="456")],
            "Lok Sabha", 18, FETCH_TIME, LS18_COMBO,
            completed_work_ids={456},
        )
        assert len(records) == 0

    def test_keeps_non_completed_ids(self):
        records = transform_works_recommended(
            [_rec_raw(work_id="789")],
            "Lok Sabha", 18, FETCH_TIME, LS18_COMBO,
            completed_work_ids={456},
        )
        assert len(records) == 1


# ============================================================================
# VALIDATORS
# ============================================================================

class TestValidators:
    def _make_alloc(self, **kwargs) -> dict:
        base = {
            "mp_name": "RAHUL GANDHI", "house": "Lok Sabha", "ls_term": 18,
            "state": "KERALA", "allocated_amount": 500000.0,
        }
        return {**base, **kwargs}

    def test_valid_allocation(self):
        assert validate_allocation(self._make_alloc()) == []

    def test_missing_mp_name(self):
        errs = validate_allocation(self._make_alloc(mp_name=""))
        assert any("mp_name" in e for e in errs)

    def test_invalid_house(self):
        errs = validate_allocation(self._make_alloc(house="Parliament"))
        assert any("house" in e for e in errs)

    def test_ls_term_mismatch_rajya(self):
        errs = validate_allocation(self._make_alloc(house="Rajya Sabha", ls_term=18))
        assert any("rajya" in e.lower() for e in errs)

    def test_ls_term_mismatch_lok(self):
        errs = validate_allocation(self._make_alloc(house="Lok Sabha", ls_term=None))
        assert any("lok" in e.lower() for e in errs)

    def test_negative_amount(self):
        errs = validate_allocation(self._make_alloc(allocated_amount=-100))
        assert any("allocated_amount" in e for e in errs)


# ============================================================================
# DEDUPLICATION
# ============================================================================

class TestDeduplication:
    def _work(self, work_id: int, house: str, ls_term, state: str, date: str, amount: float) -> dict:
        return {
            "work_id": work_id, "house": house, "ls_term": ls_term,
            "state": state, "mp_name": "TEST MP", "constituency": "TEST",
            "completion_date": date, "final_amount": amount,
            "recommendation_date": date, "recommended_amount": amount,
        }

    def test_dedup_completed_keeps_latest_date(self):
        recs = [
            self._work(1, "Lok Sabha", 18, "KERALA", "2024-01-01", 100),
            self._work(1, "Lok Sabha", 18, "KERALA", "2024-06-01", 120),
        ]
        result = deduplicate_works_completed(recs)
        assert len(result) == 1
        assert result[0]["completion_date"] == "2024-06-01"

    def test_dedup_recommended_keeps_latest_date_then_largest_amount(self):
        recs = [
            self._work(2, "Lok Sabha", 18, "BIHAR", "2024-03-01", 50000),
            self._work(2, "Lok Sabha", 18, "BIHAR", "2024-03-01", 80000),
        ]
        result = deduplicate_works_recommended(recs)
        assert len(result) == 1
        assert result[0]["recommended_amount"] == 80000

    def test_different_scope_not_deduped(self):
        recs = [
            self._work(1, "Lok Sabha", 17, "KERALA", "2024-01-01", 100),
            self._work(1, "Lok Sabha", 18, "KERALA", "2024-01-01", 100),
        ]
        result = deduplicate_works_completed(recs)
        assert len(result) == 2

    def test_rajya_sabha_null_term_scope(self):
        recs = [
            self._work(5, "Rajya Sabha", None, "KERALA", "2024-01-01", 100),
            self._work(5, "Rajya Sabha", None, "KERALA", "2024-06-01", 110),
        ]
        result = deduplicate_works_completed(recs)
        assert len(result) == 1
        assert result[0]["completion_date"] == "2024-06-01"


# ============================================================================
# MP ID determinism
# ============================================================================

class TestMpId:
    def test_same_input_produces_same_id(self):
        id1 = _make_mp_id("Rahul Gandhi", "Lok Sabha", "Wayanad")
        id2 = _make_mp_id("Rahul Gandhi", "Lok Sabha", "Wayanad")
        assert id1 == id2

    def test_case_insensitive(self):
        id1 = _make_mp_id("rahul gandhi", "Lok Sabha", "wayanad")
        id2 = _make_mp_id("RAHUL GANDHI", "Lok Sabha", "WAYANAD")
        assert id1 == id2

    def test_different_names_produce_different_ids(self):
        id1 = _make_mp_id("Rahul Gandhi", "Lok Sabha", "Wayanad")
        id2 = _make_mp_id("Narendra Modi", "Lok Sabha", "Varanasi")
        assert id1 != id2

    def test_id_is_16_chars(self):
        mp_id = _make_mp_id("Test MP", "Rajya Sabha", "Maharashtra")
        assert len(mp_id) == 16


# ============================================================================
# API Client — mocked response extraction (no live API calls)
# ============================================================================

class TestApiClientExtraction:
    """Test the response-parsing logic in isolation without network access."""

    def _make_client(self):
        from unittest.mock import MagicMock, patch
        import tempfile
        from ingestion.mplads_client import EsakshiClient
        with patch.object(EsakshiClient, '__init__', lambda self, *a, **kw: None):
            client = EsakshiClient.__new__(EsakshiClient)
            client._cookies = None
            client._data_dir = Path(tempfile.mkdtemp())
            return client

    def test_extract_direct_array(self):
        client = self._make_client()
        import json
        raw = json.dumps([{"MP_NAME": "TEST", "STATE_NAME": "KERALA"}])
        result = client._extract_array(raw, "works_completed", "Works Completed", "test")
        assert isinstance(result, list)
        assert len(result) == 1

    def test_extract_nested_key(self):
        client = self._make_client()
        import json
        payload = {"Works Completed": [{"MP_NAME": "TEST"}]}
        raw = json.dumps(payload)
        result = client._extract_array(raw, "works_completed", "Works Completed", "test")
        assert len(result) == 1

    def test_extract_double_encoded(self):
        client = self._make_client()
        import json
        inner = json.dumps([{"MP_NAME": "DOUBLE"}])
        outer = json.dumps(inner)
        result = client._extract_array(outer, "works_completed", "Works Completed", "test")
        assert result[0]["MP_NAME"] == "DOUBLE"

    def test_unknown_data_type_raises(self):
        from ingestion.mplads_client import EsakshiClient
        import tempfile
        from unittest.mock import patch
        with patch.object(EsakshiClient, '__init__', lambda self, *a, **kw: None):
            client = EsakshiClient.__new__(EsakshiClient)
            client._cookies = None
            client._data_dir = Path(tempfile.mkdtemp())
            client._http = None
        with pytest.raises(ValueError, match="Unknown data_type"):
            client.fetch_one("0,0,0,1", "unknown_type")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
