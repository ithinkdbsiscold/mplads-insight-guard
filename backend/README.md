# MPLADS Guardian — Backend README

## Overview

Python + FastAPI backend for MPLADS Guardian — an investigation-support platform for MPLADS scheme monitoring.

**This backend is completely independent from the frontend.** It communicates with the frontend only via REST APIs.

---

## Quick Start

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create a virtual environment
python -m venv venv

# 3. Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create .env from template
cp .env.example .env
# (Edit .env if needed — defaults work for local SQLite development)

# 6. Start the API server
uvicorn app.main:app --reload --port 8000
```

The API will be available at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

---

## Running Ingestion

```bash
# From the backend/ directory (with venv activated):

# Sync everything (18th LS + 17th LS + Rajya Sabha)
python scripts/sync_mplads.py --all

# Sync only 18th Lok Sabha
python scripts/sync_mplads.py --house lok_sabha --term 18

# Sync only 17th Lok Sabha
python scripts/sync_mplads.py --house lok_sabha --term 17

# Sync only Rajya Sabha
python scripts/sync_mplads.py --house rajya_sabha

# Dry run (fetch + transform but skip database writes)
python scripts/sync_mplads.py --all --dry-run
```

---

## Running Tests

```bash
# From the backend/ directory:
pytest tests/ -v

# With coverage:
pytest tests/ -v --cov=ingestion --cov=models --cov=agents --cov-report=term-missing
```

> **Note:** All tests use static mock data. No live API calls are made during testing.

---

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          ← FastAPI app + routes + CORS
│   └── config.py        ← All settings from .env
│
├── api/
│   └── routes/
│       ├── health.py
│       ├── mps.py
│       ├── projects.py
│       ├── expenditures.py
│       ├── alerts.py
│       ├── analytics.py
│       └── dashboard.py
│
├── ingestion/
│   ├── mplads_client.py   ← eSAKSHI HTTP client + session management
│   ├── transformers.py    ← Raw API → normalised schema
│   ├── validators.py      ← Field-level validation + report
│   └── deduplication.py   ← In-batch dedup + MP extraction
│
├── models/
│   ├── orm.py             ← SQLAlchemy models (MP, Work, Expenditure, etc.)
│   └── database.py        ← Engine + session factory
│
├── agents/
│   └── base.py            ← Agent interfaces + stubs
│
├── scripts/
│   └── sync_mplads.py     ← CLI sync script
│
├── tests/
│   └── test_ingestion.py  ← Test suite (no network needed)
│
├── data/
│   ├── raw/               ← Raw API responses (gitignored)
│   │   ├── lok_sabha/term_18/
│   │   ├── lok_sabha/term_17/
│   │   └── rajya_sabha/
│   └── validation/        ← Validation reports
│
├── docs/
│   ├── reference-analysis.md   ← eSAKSHI API findings
│   ├── api-contract.md         ← REST API documentation
│   ├── data-model.md           ← Database schema
│   └── ingestion.md            ← Ingestion pipeline docs
│
├── requirements.txt
├── .env.example
└── README.md
```

---

## Environment Variables

See `.env.example` for the complete list. Key variables:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/guardian.db` | Database connection string |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | Frontend CORS origins |
| `LOG_LEVEL` | `INFO` | Logging verbosity |
| `INTER_REQUEST_DELAY` | `1.0` | Seconds between API calls |

---

## Database

**Local development:** SQLite (no setup required, file created automatically)

**Production:** Set `DATABASE_URL=postgresql://user:password@host/db` in `.env`

Tables are created automatically on startup via `create_all_tables()`.

---

## Data Provenance

Every database record stores:
- `fetched_at` — UTC timestamp when the API was queried
- `source_combo` — eSAKSHI combo string used (e.g. `"0,0,0,2,7"`)
- `source_key` — eSAKSHI key string used (e.g. `"Works Completed"`)

Raw JSON responses are preserved in `data/raw/` before any transformation.

---

## House / Term Logic

| House | `ls_term` | eSAKSHI combo |
|---|---|---|
| Lok Sabha (18th) | 18 | `0,0,0,2,7` |
| Lok Sabha (17th) | 17 | `0,0,0,2,5` |
| Rajya Sabha | NULL | `0,0,0,1` |

Records from different houses and terms are NEVER mixed.

---

## Deployment

The backend can be deployed on any Python hosting platform:

- **Render** (free tier available)
- **Railway** (free tier available)
- **Fly.io** (free tier available)
- Any VPS with `uvicorn app.main:app --host 0.0.0.0 --port 8000`

Set `DATABASE_URL` to a PostgreSQL connection string in production.

The frontend reads the backend URL from:
```
VITE_API_BASE_URL=https://your-backend-url.com/api
```
