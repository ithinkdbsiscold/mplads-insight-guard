# MPLADS Guardian — API Contract

This document defines all REST API endpoints, request parameters, and example responses.

**Base URL (local):** `http://localhost:8000/api`  
**Base URL (production):** Set via `VITE_API_BASE_URL` in the frontend.

---

## Authentication

No authentication is required in the current prototype. Future versions may add API key authentication for write endpoints.

---

## Common Response Format

All list endpoints return a paginated envelope:

```json
{
  "total": 542,
  "page": 1,
  "page_size": 20,
  "pages": 28,
  "items": [...]
}
```

---

## Endpoints

### Health

#### `GET /api/health`

```json
{
  "status": "ok",
  "service": "mplads-guardian-api",
  "timestamp": "2026-08-26T08:00:00+00:00"
}
```

---

### Dashboard

#### `GET /api/dashboard/summary`

Returns top-level KPIs for the dashboard homepage.

**Response:**
```json
{
  "total_mps": 543,
  "total_works": 28412,
  "completed_works": 19204,
  "recommended_works": 9208,
  "completion_rate_pct": 67.59,
  "total_allocated_lakh": 85000.0,
  "total_expenditure_lakh": 62410.5,
  "utilization_pct": 73.42,
  "last_sync": {
    "timestamp": "2026-08-26T06:00:00+00:00",
    "house": "all",
    "status": "success"
  }
}
```

---

### MPs

#### `GET /api/mps`

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Search name, constituency, or state |
| `house` | string | `"Lok Sabha"` or `"Rajya Sabha"` |
| `state` | string | Filter by state name (partial match) |
| `page` | int | Page number (default: 1) |
| `page_size` | int | Items per page (default: 20, max: 200) |

**Example:** `GET /api/mps?house=Lok+Sabha&state=Kerala&page=1`

**Response:**
```json
{
  "total": 12,
  "page": 1,
  "page_size": 20,
  "pages": 1,
  "items": [
    {
      "mp_id": "a3b4c5d6e7f80123",
      "name": "RAHUL GANDHI",
      "house": "Lok Sabha",
      "state": "KERALA",
      "constituency": "WAYANAD"
    }
  ]
}
```

#### `GET /api/mps/{mp_id}`

**Response:**
```json
{
  "mp_id": "a3b4c5d6e7f80123",
  "name": "RAHUL GANDHI",
  "house": "Lok Sabha",
  "state": "KERALA",
  "constituency": "WAYANAD",
  "stats": {
    "allocated_amount": 25000000.0,
    "total_expenditure": 18000000.0,
    "utilization_pct": 72.0,
    "works_completed": 145,
    "works_recommended": 42
  }
}
```

---

### Projects (Works)

#### `GET /api/projects`

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Search work description |
| `house` | string | `"Lok Sabha"` or `"Rajya Sabha"` |
| `ls_term` | int | 17 or 18 (Lok Sabha only) |
| `state` | string | Filter by state |
| `constituency` | string | Filter by constituency |
| `mp_id` | string | Filter by MP id |
| `category` | string | Filter by work category |
| `status` | string | `"Completed"` or `"Recommended"` |
| `page` | int | Page number (default: 1) |
| `page_size` | int | Items per page (default: 20, max: 200) |

**Example:** `GET /api/projects?house=Lok+Sabha&ls_term=18&state=Bihar&status=Completed&page=1`

**Response:**
```json
{
  "total": 1824,
  "page": 1,
  "page_size": 20,
  "pages": 92,
  "items": [
    {
      "id": 1,
      "work_id": 100234,
      "mp_id": "a3b4c5d6e7f80123",
      "mp_name": "RAHUL GANDHI",
      "house": "Lok Sabha",
      "ls_term": 18,
      "state": "KERALA",
      "constituency": "WAYANAD",
      "work_category": "Education",
      "work_description": "Construction of school building",
      "implementing_agency": "PWD",
      "recommendation_date": "2023-04-10",
      "recommended_amount": 2000000.0,
      "completion_date": "2024-08-20",
      "final_amount": 2100000.0,
      "work_status": "Completed",
      "has_image": true,
      "average_rating": 4.2
    }
  ]
}
```

#### `GET /api/projects/{project_id}`

Returns one work record by its internal database `id` (not `work_id`).

#### `GET /api/projects/{project_id}/expenditures`

```json
{
  "project_id": 1,
  "work_id": 100234,
  "expenditures": [
    {
      "expenditure_id": "uuid-here",
      "vendor": "ACME Corp",
      "implementing_agency": "PWD",
      "expenditure_date": "2024-08-01",
      "payment_status": "Payment Success",
      "expenditure_amount": 2100000.0
    }
  ]
}
```

#### `GET /api/projects/{project_id}/analysis`

Returns agent findings for the project. Empty list until agents are run.

```json
{
  "project_id": 1,
  "work_id": 100234,
  "findings": [
    {
      "finding_id": "uuid-here",
      "agent_name": "FinancialAnomalyAgent",
      "finding_type": "cost_overrun",
      "severity": "medium",
      "score": 0.25,
      "explanation": "Final amount is 5% above recommended. Requires Review.",
      "confidence": 0.5,
      "reviewed": false
    }
  ]
}
```

---

### Expenditures

#### `GET /api/expenditures`

**Query Parameters:** `house`, `ls_term`, `state`, `mp_id`, `work_id`, `payment_status`, `page`, `page_size`

---

### Alerts

#### `GET /api/alerts`

Returns agent findings filtered by severity/review status.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `severity` | string | `low`, `medium`, `high`, `critical` |
| `agent` | string | Agent name |
| `reviewed` | bool | `true` or `false` |
| `page` | int | — |

---

### Analytics

#### `GET /api/analytics`

**Query Parameters:** `house`, `ls_term`

**Response:**
```json
{
  "by_state": [{"state": "BIHAR", "total": 4821}],
  "by_category": [{"category": "Road & Connectivity", "total": 3102}],
  "by_status": [
    {"status": "Completed", "total": 19204},
    {"status": "Recommended", "total": 9208}
  ],
  "by_payment_status": [
    {"payment_status": "Payment Success", "count": 18000, "total_amount": 5800000000}
  ]
}
```

---

## Error Responses

```json
{ "detail": "MP not found" }
```

HTTP status codes: `200 OK`, `404 Not Found`, `422 Unprocessable Entity`, `500 Internal Server Error`
