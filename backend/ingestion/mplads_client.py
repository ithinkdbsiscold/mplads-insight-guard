"""
MPLADS Guardian — Official eSAKSHI API Client

Communicates directly with https://mplads.mospi.gov.in

API contract (derived from reference-analysis.md):
  Session init : GET  /digigov/dashboard.html          → Set-Cookie
  Session test : POST /rest/PreLoginDashboardData/getTilesData
  Data fetch   : POST /rest/PreLoginDashboardData/getTilesReportData
                 Body: { "combo": "<str>", "key": "<str>" }

Combo values:
  Rajya Sabha     → "0,0,0,1"
  Lok Sabha 18th  → "0,0,0,2,7"
  Lok Sabha 17th  → "0,0,0,2,5"

Key values (data type selection):
  "Works Completed"
  "Works Recommended"
  "Expenditure on Completed and On-going Works as on Date"
  "Allocated Limit for Hon'ble MPs"
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_URL = "https://mplads.mospi.gov.in"
SESSION_PATH = "/digigov/dashboard.html"
TEST_PATH = "/rest/PreLoginDashboardData/getTilesData"
DATA_PATH = "/rest/PreLoginDashboardData/getTilesReportData"

# Combo strings for each house/term combination
COMBO = {
    ("lok_sabha", "18"): "0,0,0,2,7",
    ("lok_sabha", "17"): "0,0,0,2,5",
    ("rajya_sabha", None): "0,0,0,1",
}

# Request `key` values for each data type
DATA_TYPE_KEYS = {
    "works_completed": "Works Completed",
    "works_recommended": "Works Recommended",
    "expenditure": "Expenditure on Completed and On-going Works as on Date",
    "allocated_limit": "Allocated Limit for Hon'ble MPs",
}

# Fallback key names observed in API responses
RESPONSE_KEY_FALLBACKS: dict[str, list[str]] = {
    "works_completed":  ["Total Works Completed", "Works Completed"],
    "works_recommended": ["Total Works Recommended", "Works Recommended"],
    "expenditure": [
        "Total Expenditure",
        "Expenditure on Completed and On-going Works as on Date",
    ],
    "allocated_limit": [
        "Allocated Limit",
        "Allocated Limit for",
        "Allocated Limit for Hon'ble MPs",
    ],
}

# Time between individual API calls (seconds) — be polite to the server
INTER_REQUEST_DELAY = 1.0

# Request timeout in seconds
REQUEST_TIMEOUT = 120

# Session cache TTL (seconds)
SESSION_TTL = 4 * 60 * 60  # 4 hours

BROWSER_HEADERS = {
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json; charset=UTF-8",
    "Origin": BASE_URL,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/138.0.0.0 Safari/537.36"
    ),
    "X-Requested-With": "XMLHttpRequest",
    "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
}


# ---------------------------------------------------------------------------
# Session file persistence
# ---------------------------------------------------------------------------

def _get_session_file(data_dir: Path) -> Path:
    return data_dir / "session.json"


def _load_session(data_dir: Path) -> Optional[str]:
    """Return cached cookie string if still valid, else None."""
    sess_file = _get_session_file(data_dir)
    if not sess_file.exists():
        return None
    try:
        state = json.loads(sess_file.read_text(encoding="utf-8"))
        age = time.time() - state.get("timestamp", 0)
        if age < SESSION_TTL:
            logger.info("Loaded cached session (age=%.0fs)", age)
            return state.get("cookies")
        logger.info("Cached session expired (age=%.0fs)", age)
        sess_file.unlink(missing_ok=True)
    except Exception as exc:
        logger.warning("Could not load session cache: %s", exc)
    return None


def _save_session(data_dir: Path, cookies: str) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    state = {"cookies": cookies, "timestamp": time.time()}
    _get_session_file(data_dir).write_text(json.dumps(state, indent=2), encoding="utf-8")
    logger.info("Session cached to disk")


# ---------------------------------------------------------------------------
# HTTP session with retry
# ---------------------------------------------------------------------------

def _make_http_session() -> requests.Session:
    sess = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=2,
        status_forcelist=[500, 502, 503, 504],
        allowed_methods=["GET", "POST"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    sess.mount("https://", adapter)
    sess.mount("http://", adapter)
    sess.headers.update(BROWSER_HEADERS)
    return sess


# ---------------------------------------------------------------------------
# EsakshiClient
# ---------------------------------------------------------------------------

class EsakshiClient:
    """
    HTTP client for the MPLADS/eSAKSHI pre-login dashboard API.

    Usage:
        client = EsakshiClient()
        records = client.fetch_one("0,0,0,2,7", "works_completed")
    """

    def __init__(self, data_dir: Optional[Path] = None):
        self._data_dir = data_dir or Path(__file__).parent.parent / "data"
        self._http = _make_http_session()
        self._cookies: Optional[str] = _load_session(self._data_dir)

    # -------------------------------------------------------------------------
    # Session management
    # -------------------------------------------------------------------------

    def _init_session(self) -> bool:
        """Visit the dashboard page to obtain fresh session cookies."""
        logger.info("Initialising eSAKSHI session via %s%s", BASE_URL, SESSION_PATH)
        try:
            resp = self._http.get(
                f"{BASE_URL}{SESSION_PATH}",
                timeout=30,
                headers={
                    "Accept": (
                        "text/html,application/xhtml+xml,application/xml;"
                        "q=0.9,image/avif,image/webp,*/*;q=0.8"
                    ),
                    "Cache-Control": "no-cache",
                },
                allow_redirects=True,
            )
            raw = resp.headers.get("Set-Cookie", "")
            if not raw:
                cookies_list = resp.cookies.items()
                raw = "; ".join(f"{k}={v}" for k, v in cookies_list)

            if not raw:
                logger.warning("No Set-Cookie headers received from session init")
                return False

            self._cookies = raw
            _save_session(self._data_dir, raw)
            logger.info("Session initialised successfully")
            return True
        except Exception as exc:
            logger.error("Session init failed: %s", exc)
            return False

    def _is_session_valid(self) -> bool:
        if not self._cookies:
            return False
        try:
            body = json.dumps({"uname": "0,0,0,2"})
            resp = self._http.post(
                f"{BASE_URL}{TEST_PATH}",
                data=body,
                timeout=15,
                headers={"Cookie": self._cookies, "Content-Type": "application/json; charset=UTF-8"},
            )
            if resp.status_code != 200:
                return False
            parsed = resp.json()
            return bool(parsed and isinstance(parsed, dict) and parsed)
        except Exception:
            return False

    def ensure_session(self) -> None:
        """Validate existing session or create a new one. Raises on failure."""
        if self._is_session_valid():
            logger.info("Session valid")
            return
        logger.info("Session invalid — re-initialising")
        ok = self._init_session()
        if not ok:
            raise RuntimeError("Failed to establish eSAKSHI session")

    # -------------------------------------------------------------------------
    # Core fetch
    # -------------------------------------------------------------------------

    def fetch_one(self, combo: str, data_type: str) -> list[dict]:
        """
        Fetch one data type for one house/term combo.

        Args:
            combo:     eSAKSHI combo string e.g. "0,0,0,2,7"
            data_type: one of 'works_completed', 'works_recommended',
                       'expenditure', 'allocated_limit'

        Returns:
            List of raw record dicts as returned by the API.

        Raises:
            ValueError: if data_type is not recognised
            RuntimeError: if the API returns an unexpected response
        """
        if data_type not in DATA_TYPE_KEYS:
            raise ValueError(f"Unknown data_type: {data_type!r}")

        key = DATA_TYPE_KEYS[data_type]
        body = json.dumps({"combo": combo, "key": key})
        label = f"combo={combo} type={data_type}"

        logger.info("Fetching %s ...", label)

        headers = {**BROWSER_HEADERS, "Content-Type": "application/json; charset=UTF-8"}
        if self._cookies:
            headers["Cookie"] = self._cookies

        from app.config import settings
        max_retries = getattr(settings, 'max_retries', 3)
        attempt = 0
        
        while attempt <= max_retries:
            try:
                resp = self._http.post(
                    f"{BASE_URL}{DATA_PATH}",
                    data=body,
                    timeout=REQUEST_TIMEOUT,
                    headers=headers,
                )
                if resp.status_code in (429, 500, 502, 503, 504):
                    raise requests.exceptions.HTTPError(f"HTTP {resp.status_code}")
                if resp.status_code != 200:
                    raise RuntimeError(
                        f"HTTP {resp.status_code} fetching {label}: {resp.text[:200]}"
                    )
                logger.debug("%s — %d bytes received", label, len(resp.content))
                return self._extract_array(resp.text, data_type, key, label)
            except (requests.exceptions.RequestException, ConnectionResetError, ConnectionError, TimeoutError) as exc:
                if attempt >= max_retries:
                    raise RuntimeError(f"Failed {label} after {max_retries} retries: {exc}") from exc
                attempt += 1
                sleep_time = 2 ** attempt
                logger.warning("Retry %d/%d for %s after error: %s. Sleeping %.1fs", attempt, max_retries, label, exc, sleep_time)
                time.sleep(sleep_time)

    def _extract_array(
        self, raw: str, data_type: str, expected_key: str, label: str
    ) -> list[dict]:
        """Parse the API response and extract the data array."""
        try:
            parsed: Any = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"JSON parse error for {label}: {exc}\n"
                f"Body prefix: {raw[:300]}"
            ) from exc

        # Case 1: top-level array
        if isinstance(parsed, list):
            logger.info("%s — %d records (direct array)", label, len(parsed))
            return parsed  # type: ignore[return-value]

        # Case 2: top-level string (double-encoded JSON)
        if isinstance(parsed, str):
            inner = json.loads(parsed)
            if isinstance(inner, list):
                logger.info("%s — %d records (double-encoded)", label, len(inner))
                return inner  # type: ignore[return-value]

        if not isinstance(parsed, dict):
            raise RuntimeError(f"Unexpected response type {type(parsed)} for {label}")

        available_keys = list(parsed.keys())

        # Try exact match
        if expected_key in parsed:
            return self._coerce_array(parsed[expected_key], data_type, label)

        # Try partial match
        for k in available_keys:
            if (
                expected_key.lower() in k.lower()
                or k.lower() in expected_key.lower()
            ):
                return self._coerce_array(parsed[k], data_type, label)

        # Try known fallback keys
        for fallback in RESPONSE_KEY_FALLBACKS.get(data_type, []):
            if fallback in parsed:
                return self._coerce_array(parsed[fallback], data_type, label)

        # Single-key response
        if len(available_keys) == 1:
            return self._coerce_array(parsed[available_keys[0]], data_type, label)

        raise RuntimeError(
            f"Could not find data array in response for {label}.\n"
            f"Available keys: {available_keys}"
        )

    def _coerce_array(self, value: Any, data_type: str, label: str) -> list[dict]:
        if isinstance(value, list):
            logger.info("%s — %d records", label, len(value))
            return value  # type: ignore[return-value]
        if isinstance(value, str):
            inner = json.loads(value)
            if isinstance(inner, list):
                logger.info("%s — %d records (string-encoded)", label, len(inner))
                return inner  # type: ignore[return-value]
        raise RuntimeError(f"Expected array for {data_type} but got {type(value)}")

    # -------------------------------------------------------------------------
    # High-level fetch helpers
    # -------------------------------------------------------------------------

    DATA_TYPES = list(DATA_TYPE_KEYS.keys())

    def fetch_all_for_combo(
        self, combo: str, label: str
    ) -> tuple[dict[str, list[dict]], list[dict]]:
        """Fetch all four data types for a given combo string. Returns (results, errors)"""
        results: dict[str, list[dict]] = {}
        errors: list[dict] = []
        for dt in self.DATA_TYPES:
            try:
                results[dt] = self.fetch_one(combo, dt)
            except Exception as exc:
                logger.error("Failed fetching %s %s: %s", label, dt, exc)
                results[dt] = []
                errors.append({
                    "dataset": dt,
                    "error": str(exc),
                    "retry_count": getattr(__import__('app.config', fromlist=['settings']).settings, 'max_retries', 3),
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                })
            time.sleep(INTER_REQUEST_DELAY)
        return results, errors

    def fetch_all(
        self,
        ls_term: str = "both",
    ) -> dict[str, dict[str, list[dict]]]:
        """
        Fetch complete dataset for the requested houses/terms.

        Args:
            ls_term: "17" | "18" | "both"

        Returns:
            {
                "lok_sabha_18": { "works_completed": [...], ... },
                "lok_sabha_17": { ... },
                "rajya_sabha":  { ... },
                "metadata": { "fetch_time": "...", "ls_term_option": "..." },
            }
        """
        self.ensure_session()
        opt = ls_term.lower()

        result: dict[str, Any] = {
            "lok_sabha_18": {dt: [] for dt in self.DATA_TYPES},
            "lok_sabha_17": {dt: [] for dt in self.DATA_TYPES},
            "rajya_sabha":  {dt: [] for dt in self.DATA_TYPES},
            "errors": []
        }

        if opt in ("18", "both"):
            logger.info("Fetching Lok Sabha 18th term...")
            data, errs = self.fetch_all_for_combo(COMBO[("lok_sabha", "18")], "LS18")
            result["lok_sabha_18"] = data
            for e in errs:
                e.update({"house": "lok_sabha", "ls_term": 18})
            result["errors"].extend(errs)

        if opt in ("17", "both"):
            logger.info("Fetching Lok Sabha 17th term...")
            data, errs = self.fetch_all_for_combo(COMBO[("lok_sabha", "17")], "LS17")
            result["lok_sabha_17"] = data
            for e in errs:
                e.update({"house": "lok_sabha", "ls_term": 17})
            result["errors"].extend(errs)

        logger.info("Fetching Rajya Sabha...")
        data, errs = self.fetch_all_for_combo(COMBO[("rajya_sabha", None)], "RS")
        result["rajya_sabha"] = data
        for e in errs:
            e.update({"house": "rajya_sabha", "ls_term": None})
        result["errors"].extend(errs)

        result["metadata"] = {
            "fetch_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "ls_term_option": opt,
        }

        return result
