# RailETA Backend — SIH 26028

## Project Goal
Build a real FastAPI backend for the RailETA three-model ETA forecasting system, integrate the ML team's final runtime and artifacts, then connect live train data, caching, persistence, tests, frontend, and deployment.

## Source of Truth
Final ML deployment package provided by the ML team.

## Confirmed Model Routing
- PRE_DEPARTURE -> MODEL_1
- RUNNING_NEXT_STATION -> MODEL_2
- RUNNING_LATER_STATIONS -> MODEL_3
- COMPLETED -> no prediction

## Development Rule
A task is complete only after it is executed and verified successfully.

Code written != Complete
Command/test passes == Complete

## Project Status
Current Phase: Phase 0 — Clean Setup & ML Runtime Verification

### Completed
- [x] Final ML Drive handoff received
- [x] Model 1 artifact available
- [x] Model 2 artifact available
- [x] Model 3 artifact available
- [x] ML runtime package available
- [x] Saved demo journey available
- [x] ML dependency versions available

### Pending
- [ ] Fresh local backend workspace created
- [ ] Python environment verified
- [ ] ML deployment package copied locally
- [ ] Exact ML dependencies installed
- [ ] Saved demo reproduced outside FastAPI
- [ ] All 3 models load successfully
- [ ] FastAPI skeleton created
- [ ] Truthful readiness endpoint implemented
- [ ] ML adapter connected to real inference
- [ ] Saved-demo forecast endpoint working
- [ ] Live rail provider integrated
- [ ] Dynamic model routing verified
- [ ] Cache implemented
- [ ] Database persistence implemented
- [ ] Tests passing
- [ ] Frontend integrated
- [ ] Dockerized
- [ ] Deployed

## Target Architecture

```text
Frontend
   |
   v
FastAPI API
   |
   v
Forecast Service
   |
   +--> Rail Provider --> Normalized TrainSnapshot
   |
   +--> Feature Preparation
   |
   +--> ML Adapter
            |
            +--> Model Loader
            |
            +--> Model Router
                    |
                    +--> Model 1: pre-departure
                    +--> Model 2: immediate next station
                    +--> Model 3: later stations
   |
   +--> Cache
   |
   +--> Persistence
   |
   v
Standard Forecast Response
```

## Phase Plan
1. Phase 0 — Verify ML handoff
2. Phase 1 — Backend skeleton
3. Phase 2 — Real ML integration
4. Phase 3 — Saved demo API
5. Phase 4 — Stable API contract
6. Phase 5 — Live train provider
7. Phase 6 — Dynamic model routing
8. Phase 7 — Cache and resilience
9. Phase 8 — Database persistence
10. Phase 9 — Tests
11. Phase 10 — Frontend integration
12. Phase 11 — Docker and deployment

## Known ML Constraints
- Model 1 is not trained on verified NTES operational history.
- Model 1 requires some operational features not currently supplied by RailRadar.
- Model 2 was trained mainly on non-negative delays.
- Model 3 currently has limited historical coverage.
- Uncertainty intervals require recalibration as more journeys are collected.
- Backend must never fabricate missing model features.

## Work Log

### Step 0.1 — Fresh Workspace
Status: IN PROGRESS

Goal:
Create a clean backend workspace without deleting the old implementation.

Verification required:
- old project preserved
- new folder exists
- README.md exists
- initial target folder skeleton exists

Next step after PASS:
Step 0.2 — Verify Python 3.11 environment


## Phase 16 — Observability & Production Error Handling ✅ COMPLETE

### Implemented

* Request IDs are propagated through:

  * `X-Request-ID` request header
  * response header
  * application error response body
  * unexpected 500 response body

* Added safe provider logging for RailRadar:

  * provider request started
  * provider response received
  * timeout
  * network failure
  * request duration
  * status code

* Sensitive provider data is not logged:

  * API keys
  * Authorization headers
  * complete provider payloads

* Added provider logging regression tests to prevent future secret leakage.

* HTTP request logging now uses severity based on response status:

  * 2xx / 3xx → INFO
  * 4xx → WARNING
  * 5xx → ERROR

* Added safe global handling for unexpected backend exceptions:

  * HTTP 500
  * `INTERNAL_SERVER_ERROR`
  * no internal traceback or exception message exposed to clients
  * request ID included in body and response header

* Removed duplicate traceback logging for unexpected exceptions.

* Added duplicate-log regression protection:

  * one authoritative `unhandled_exception` traceback
  * no duplicate `request_failed` traceback

### Health Contract

`GET /health`

Success:

```json
{
  "status": "healthy",
  "version": "1.0.0-prototype"
}
```

HTTP:

```text
200
```

### Readiness Contract

`GET /ready`

Ready state:

```text
HTTP 200
status = ready
```

Not-ready state:

```text
HTTP 503
status = not_ready
```

Readiness verifies:

* Model 1 loaded
* Model 2 loaded
* Model 3 loaded
* model configuration available
* saved demo payload available

### Typed OpenAPI Contracts

Health:

```text
200 -> HealthResponse
```

Readiness:

```text
200 -> ReadyResponse
503 -> ReadyResponse
```

Live forecast:

```text
200 -> LiveForecastResponse
404 -> ApplicationErrorResponse
422 -> HTTPValidationError
429 -> ApplicationErrorResponse
503 -> ApplicationErrorResponse
504 -> ApplicationErrorResponse
```

Predeparture:

```text
200 -> PredepartureForecastResponse
422 -> validation / invalid model input
500 -> ApplicationErrorResponse
503 -> ApplicationErrorResponse
```

### Regression Status

Final Phase 16 suite:

```text
55 passed
0 failed
```

Phase 16 is frozen. Production behavior must not be changed without passing the full regression suite.
