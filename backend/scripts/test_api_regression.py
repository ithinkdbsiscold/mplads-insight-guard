"""
API Regression Tests for PostgreSQL Migration

Verifies all major endpoints still respond correctly with real data.
Run against the live API server:
    python scripts/test_api_regression.py
"""
import os
import sys
import time
import logging
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

BASE = os.environ.get("API_BASE", "http://localhost:8000/api/v1")

passed = 0
failed = 0


def check(name, url, params=None, checks=None):
    global passed, failed
    try:
        t = time.time()
        r = requests.get(url, params=params, timeout=30)
        elapsed = time.time() - t
        
        if r.status_code != 200:
            logger.error(f"  FAIL {name}: status={r.status_code} ({elapsed:.2f}s)")
            failed += 1
            return
        
        data = r.json()
        
        if checks:
            for desc, test_fn in checks:
                if not test_fn(data):
                    logger.error(f"  FAIL {name} -> {desc}")
                    failed += 1
                    return
        
        logger.info(f"  OK   {name} ({elapsed:.2f}s)")
        passed += 1
        
    except Exception as e:
        logger.error(f"  FAIL {name}: {e}")
        failed += 1


def main():
    logger.info("=" * 60)
    logger.info("API REGRESSION TESTS")
    logger.info(f"Base URL: {BASE}")
    logger.info("=" * 60)

    # Health
    check("Health Check", f"{BASE}/health", checks=[
        ("has status", lambda d: "status" in d),
        ("has database", lambda d: "database" in d),
    ])

    # Dashboard - Lok Sabha 18
    check("Dashboard LS18", f"{BASE}/dashboard/summary",
          params={"house": "Lok Sabha", "ls_term": 18},
          checks=[
              ("has kpis", lambda d: "kpis" in d),
              ("total_mps > 0", lambda d: d["kpis"]["total_mps"] > 0),
              ("total_works > 0", lambda d: d["kpis"]["total_works"] > 0),
              ("has state_overview", lambda d: "state_overview" in d),
          ])

    # Dashboard - Lok Sabha 17
    check("Dashboard LS17", f"{BASE}/dashboard/summary",
          params={"house": "Lok Sabha", "ls_term": 17},
          checks=[
              ("total_mps > 0", lambda d: d["kpis"]["total_mps"] > 0),
          ])

    # Dashboard - Rajya Sabha
    check("Dashboard RS", f"{BASE}/dashboard/summary",
          params={"house": "Rajya Sabha"},
          checks=[
              ("total_mps > 0", lambda d: d["kpis"]["total_mps"] > 0),
          ])

    # Dashboard - State filter
    check("Dashboard State Filter", f"{BASE}/dashboard/summary",
          params={"house": "Lok Sabha", "ls_term": 18, "state": "Uttar Pradesh"},
          checks=[
              ("total_mps > 0", lambda d: d["kpis"]["total_mps"] > 0),
          ])

    # MPs list
    check("MPs List LS18", f"{BASE}/mps",
          params={"house": "Lok Sabha", "ls_term": 18, "page": 1, "page_size": 5},
          checks=[
              ("has items", lambda d: "items" in d),
              ("has total", lambda d: d["total"] > 0),
              ("pagination works", lambda d: len(d["items"]) <= 5),
              ("has pages", lambda d: "pages" in d),
          ])

    # MPs search
    check("MPs Search", f"{BASE}/mps",
          params={"house": "Lok Sabha", "ls_term": 18, "search": "Modi"},
          checks=[
              ("has items", lambda d: "items" in d),
          ])

    # MP states
    check("MP States LS18", f"{BASE}/mps/states",
          params={"house": "Lok Sabha", "ls_term": 18},
          checks=[
              ("has states", lambda d: "states" in d and len(d["states"]) > 0),
          ])

    # MP detail (get first MP from list)
    try:
        r = requests.get(f"{BASE}/mps", params={"house": "Lok Sabha", "ls_term": 18, "page_size": 1})
        mp_id = r.json()["items"][0]["mp_id"]
        check(f"MP Detail ({mp_id})", f"{BASE}/mps/{mp_id}",
              params={"house": "Lok Sabha", "ls_term": 18},
              checks=[
                  ("has mp", lambda d: "mp" in d),
                  ("has stats", lambda d: "stats" in d),
                  ("has projects", lambda d: "projects" in d),
              ])
    except Exception as e:
        logger.error(f"  FAIL MP Detail: {e}")

    # Projects list
    check("Projects List LS18", f"{BASE}/projects",
          params={"house": "Lok Sabha", "ls_term": 18, "page": 1, "page_size": 5},
          checks=[
              ("has items", lambda d: "items" in d),
              ("has total", lambda d: d["total"] > 0),
              ("has total_pages", lambda d: "total_pages" in d),
          ])

    # Project search
    check("Project Search", f"{BASE}/projects",
          params={"house": "Lok Sabha", "ls_term": 18, "search": "school"},
          checks=[
              ("has items", lambda d: "items" in d),
          ])

    # Project detail (get first from list)
    try:
        r = requests.get(f"{BASE}/projects", params={"house": "Lok Sabha", "ls_term": 18, "page_size": 1})
        pid = r.json()["items"][0]["id"]
        check(f"Project Detail ({pid})", f"{BASE}/projects/{pid}",
              checks=[
                  ("has work_id", lambda d: "work_id" in d),
              ])
    except Exception as e:
        logger.error(f"  FAIL Project Detail: {e}")

    # Expenditures
    check("Expenditures List", f"{BASE}/expenditures",
          params={"house": "Lok Sabha", "ls_term": 18, "page": 1, "page_size": 5},
          checks=[
              ("has items", lambda d: "items" in d),
              ("has total", lambda d: d["total"] > 0),
          ])

    # Analytics
    check("Analytics", f"{BASE}/analytics",
          checks=[
              ("returns data", lambda d: d is not None),
          ])

    # Alerts
    check("Alerts", f"{BASE}/alerts",
          checks=[
              ("returns data", lambda d: d is not None),
          ])

    logger.info("")
    logger.info("=" * 60)
    logger.info(f"REGRESSION RESULTS: {passed} passed, {failed} failed")
    logger.info("=" * 60)

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
