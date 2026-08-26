# MPLADS eSAKSHI API — Reference Analysis

**Project:** MPLADS Guardian  
**Reference Studied:** Empowered Indian (`upload-scripts/src/`)  
**Analyst:** Backend Lead  
**Date:** 2026-08-26  

---

## 1. Official API Endpoint(s) Used

The reference project communicates with a single host:

```
https://mplads.mospi.gov.in
```

Three endpoints are accessed:

| # | Purpose | Method | Path |
|---|---------|--------|------|
| 1 | Session init (get cookies) | GET | `/digigov/dashboard.html` |
| 2 | Session validity test | POST | `/rest/PreLoginDashboardData/getTilesData` |
| 3 | **Primary data fetch** | POST | `/rest/PreLoginDashboardData/getTilesReportData` |

The primary data endpoint is the only one that returns MPLADS records.

---

## 2. HTTP Methods

- Session init: `GET`
- Session test: `POST` with JSON body
- Data fetch: `POST` with JSON body

All requests include standard browser-like headers (User-Agent, Accept, sec-ch-ua, X-Requested-With).

---

## 3. Required Request Payloads

### Session Test Payload
```json
{ "uname": "0,0,0,2" }
```

### Data Fetch Payload
```json
{ "combo": "<house_combo_string>", "key": "<data_type_key_string>" }
```

---

## 4. Session / Cookie Behavior

- The GET to `/digigov/dashboard.html` returns `Set-Cookie` headers.
- These cookies are extracted and forwarded as the `Cookie` header in all subsequent POST requests.
- Session is valid for approximately 4 hours (as assumed by the reference implementation).
- The reference caches the session cookies to a local `data/session.json` file with a timestamp.
- If the session is expired or invalid, a new session is initialised by repeating the GET request.
- No username/password login is required. This is a **pre-login public API**.
- The CSRF token field exists in the reference code but is empty by default — the API does not appear to require it for pre-login endpoints.

---

## 5. Lok Sabha Parameters

The `combo` string for Lok Sabha encodes house + tenure ID:

| Lok Sabha Term | `combo` value |
|---|---|
| 18th Lok Sabha | `"0,0,0,2,7"` |
| 17th Lok Sabha | `"0,0,0,2,5"` |

The segment structure appears to be: `category,subcategory,filter,house_type_id,tenure_id`.

- `house_type_id = 2` for Lok Sabha
- `tenure_id = 7` for 18th term, `tenure_id = 5` for 17th term

---

## 6. Rajya Sabha Parameters

| House | `combo` value |
|---|---|
| Rajya Sabha | `"0,0,0,1"` |

- `house_type_id = 1` for Rajya Sabha
- No tenure ID suffix — Rajya Sabha is not divided by terms in the API

---

## 7. Lok Sabha Term Handling

- The ingestion pipeline fetches LS 17th and 18th separately (two distinct API calls per data type).
- After transformation, every LS record is tagged with `lsTerm = 17` or `lsTerm = 18`.
- Rajya Sabha records are tagged with `lsTerm = null`.
- Deduplication and querying are always scoped to `(house, lsTerm)` to prevent cross-term pollution.
- In storage, the uniqueness constraint for works is `(house, ls_term, state, work_id)`.

---

## 8. Available Datasets

Four data types are fetched per house/term combination:

| Internal Key | `key` string sent in POST body |
|---|---|
| `works_completed` | `"Works Completed"` |
| `works_recommended` | `"Works Recommended"` |
| `expenditure` | `"Expenditure on Completed and On-going Works as on Date"` |
| `allocated_limit` | `"Allocated Limit for Hon'ble MPs"` |

Total API calls for a full sync:
- Lok Sabha 18th: 4 calls
- Lok Sabha 17th: 4 calls
- Rajya Sabha: 4 calls
- **Total: 12 API calls**

The reference adds a 1-second delay between each call.

---

## 9. Source Field → Transformed Field Mappings

### Allocated Limit (`allocated_limit`)

| Source Field | Guardian Field | Notes |
|---|---|---|
| `STATE_NAME` | `state` | — |
| `MP_NAME` | `mp_name` | — |
| `CONSTITUENCY` | `constituency` | Normalised |
| `ALLOCATED_AMT` | `allocated_amount` | Indian number parser |
| `Sno` | `sr_no` | — |
| _(injected)_ | `house` | `"Lok Sabha"` or `"Rajya Sabha"` |
| _(injected)_ | `ls_term` | 17 or 18 for LS; `null` for RS |

### Expenditure

| Source Field | Guardian Field | Notes |
|---|---|---|
| `STATE_NAME` | `state` | — |
| `MP_NAME` | `mp_name` | — |
| `CONSTITUENCY` | `constituency` | Normalised |
| `WORK_RECOMMENDATION_DTL_ID` | `work_id` | Parsed as integer; cross-links all record types |
| `ACTIVITY_NAME` | `work_description` | Cleaned text |
| `VENDOR_NAME` | `vendor` | — |
| `IDA_NAME` or `IA_NAME` | `implementing_agency` | API uses both field names |
| `EXPENDITURE_DATE` | `expenditure_date` | DD-MMM-YYYY → YYYY-MM-DD |
| `WORK_STATUS` or `PAYMENT_STATUS` | `payment_status` | API uses both field names |
| `FUND_DISBURSED_AMT` or `EXPENDITURE_AMOUNT` | `expenditure_amount` | Indian number parser |

### Works Completed

| Source Field | Guardian Field | Notes |
|---|---|---|
| `STATE_NAME` | `state` | — |
| `MP_NAME` | `mp_name` | — |
| `CONSTITUENCY` | `constituency` | Normalised |
| `WORK_RECOMMENDATION_DTL_ID` | `work_id` | Primary cross-reference key |
| `WORK_CATEGORY` | `work_category` | — |
| `IDA_NAME` | `implementing_agency` | — |
| `WORK_DESCRIPTION` / `ACTIVITY_NAME` | `work_description` | Fallback chain |
| `ACTUAL_END_DATE` | `completion_date` | DD-MMM-YYYY → YYYY-MM-DD |
| `FILE_STATUS` | `has_image` | Boolean coercion |
| `AVERAGE_RATING` | `average_rating` | Float or null |
| `ACTUAL_AMOUNT` | `final_amount` | Indian number parser |

**Rows filtered out:**
- Must have `ACTUAL_END_DATE` and `ACTUAL_AMOUNT`
- Must have a valid positive `WORK_RECOMMENDATION_DTL_ID`

### Works Recommended

| Source Field | Guardian Field | Notes |
|---|---|---|
| `STATE_NAME` | `state` | — |
| `MP_NAME` | `mp_name` | — |
| `CONSTITUENCY` | `constituency` | Normalised |
| `WORK_RECOMMENDATION_DTL_ID` | `work_id` | — |
| `WORK_CATEGORY` | `work_category` | — |
| `IDA_NAME` | `implementing_agency` | — |
| `WORK_DESCRIPTION` / `ACTIVITY_NAME` | `work_description` | Fallback chain |
| `RECOMMENDATION_DATE` | `recommendation_date` | DD-MMM-YYYY → YYYY-MM-DD |
| `FILE_STATUS` | `has_image` | Boolean coercion |
| `RECOMMENDED_AMOUNT` | `recommended_amount` | Indian number parser |

**Rows filtered out:**
- Must have `RECOMMENDATION_DATE` and `RECOMMENDED_AMOUNT`
- Must have a valid positive `WORK_RECOMMENDATION_DTL_ID`
- Excluded if `WORK_RECOMMENDATION_DTL_ID` is already in the completed works set

---

## 10. Validation Logic

Applied at transformation time (before storage):

| Check | Rule |
|---|---|
| `STATE_NAME` | Non-empty, length > 1 |
| `MP_NAME` | Non-empty, length > 1 |
| Grand total rows | Skip if STATE_NAME or MP_NAME contains "total" or "grand" |
| Amount fields | Must be ≥ 0 (after parsing) |
| `has_image` | Coerced to boolean from string `"true"` |
| `average_rating` | 0–5 float or null; `"N/A"` maps to null |
| `work_id` | Must parse to a positive integer |
| Date fields | Must be parseable DD-MMM-YYYY or ISO; null on failure |

---

## 11. Deduplication Logic

### In-batch (before insertion)

**Deduplication key:** `(house, ls_term, state, work_id)`

- **Works Completed:** keep record with the latest `completion_date`
- **Works Recommended:** keep record with the latest `recommendation_date`; break ties by largest `recommended_amount`
- **Expenditures:** each `work_id` can have multiple payment events — deduplicate only exact duplicates: `(house, ls_term, state, work_id, expenditure_date, payment_status, expenditure_amount)`
- **Allocations:** unique per `(house, ls_term, mp_name, constituency)`; keep record with largest `allocated_amount`

### Cross-collection deduplication

Works Recommended excludes any `work_id` already present in Works Completed (same house/ls_term).

### Storage-level deduplication (idempotent runs)

Before inserting a scope, all existing records for `(house, ls_term)` are deleted. This makes every run a full replacement of that scope. A unique database constraint `(house, ls_term, state, work_id)` provides the final layer of protection.

---

## 12. Data Synchronization Logic

The sync sequence per run:

1. Validate/refresh session cookies
2. Fetch all 4 data types for LS 18th
3. Fetch all 4 data types for LS 17th (if requested)
4. Fetch all 4 data types for Rajya Sabha
5. Store raw API responses to disk
6. Transform each dataset
7. Validate records
8. Deduplicate in-batch
9. Extract MP entities
10. Clear scoped existing data
11. Insert normalised records
12. Write sync metadata (timestamp, counts)

Delays: 1 second between individual API calls to avoid hammering the server.  
Timeout: 120 seconds per POST request.

---

## 13. Limitations and Assumptions

| Item | Status |
|---|---|
| Authentication | **Not required** — pre-login public API |
| Pagination | **None** — full dataset returned per request |
| Rate limiting | **Unknown** — reference uses 1s delay; may be throttled |
| Session TTL | **Assumed 4h** — not documented by the API |
| API stability | **Unknown** — undocumented public endpoint, may change |
| Tenure ID values | **Observed**: 7 = 18th LS, 5 = 17th LS; other terms not explored |
| RS without tenure | **Confirmed** — Rajya Sabha has no tenure ID in the combo |
| `CSRF-Token` | **Not used** — field exists in reference code but left empty |
| Record count | **Unknown upfront** — full data returned, no count endpoint |
| Field availability | Some fields exist for one house but not the other (e.g., `IA_NAME` vs `IDA_NAME`) |
| Official docs | **None found** — API is undocumented |
| Data freshness | **Unknown** — assumed live/near-live from official portal |
