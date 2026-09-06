# RailETA Frontend API Contract

## Base URL

Local development:

```text
http://127.0.0.1:8000
```

Frontend environment variable:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Endpoints

### 1. Health

```http
GET /health
```

Purpose: basic application health check.

### 2. Readiness

```http
GET /ready
```

Purpose: checks whether the backend is ready to serve inference.

Readiness includes:

* Model 1 loaded
* Model 2 loaded
* Model 3 loaded
* Configuration loaded
* Saved demo payload available

### 3. Verified Demo Forecast

```http
GET /v1/demo
```

Purpose: runs the saved verified RailETA journey through the same extracted production inference pipeline used by the running-train system.

This is not a fake hardcoded prediction response.

```text
saved RailRadar payload
-> leakage-safe normalizer
-> Model 2 / Model 3 hybrid
-> response builder
-> frontend JSON
```

Use this endpoint when:

* live provider is unavailable
* demonstrating the system without external API dependency
* frontend integration is being tested

Response model:

```text
LiveForecastResponse
```

### 4. Live Running Train Forecast

```http
POST /v1/forecast/live
```

Request:

```json
{
  "train_number": "12615",
  "journey_date": "2026-09-01"
}
```

`journey_date` is optional and must use `YYYY-MM-DD`.

Minimal request:

```json
{
  "train_number": "12615"
}
```

Processing flow:

```text
Frontend
-> FastAPI
-> LiveForecastService
-> provider payload cache
-> RailRadar
-> leakage-safe normalizer
-> Model 2 next-station prediction
-> Model 3 multi-horizon prediction
-> response builder
-> JSON response
```

Model routing:

```text
Immediate next station -> MODEL_2_NEXT_STATION
Later stations         -> MODEL_3_MULTI_HORIZON
```

The provider ETA is not used as an ML input. It appears only under `comparison_only`.

## Live Response

Top-level structure:

```json
{
  "success": true,
  "system": {},
  "journey": {},
  "predictions": [],
  "backend": {}
}
```

### Journey

Important fields:

```text
journey_id
train_number
train_name
current_station_code
current_station_name
current_observed_arrival
current_delay_min
observed_stations
upcoming_stations
state_source
```

### Prediction

Each `predictions[]` item contains:

```text
station
schedule
forecast
model
explanation
comparison_only
```

Station example:

```json
{
  "code": "ET",
  "name": "Itarsi Jn",
  "stations_ahead": 1,
  "distance_km": 16.2
}
```

Forecast example:

```json
{
  "eta": "2026-09-01T17:09:15+05:30",
  "predicted_delay_min": 29.3,
  "delay_status": "LATE",
  "lower_eta": "2026-09-01T16:46:46+05:30",
  "upper_eta": "2026-09-01T17:31:44+05:30",
  "interval_radius_min": 22.5,
  "confidence": "HIGH"
}
```

Passenger-facing prediction should use:

```text
forecast.eta
forecast.predicted_delay_min
forecast.delay_status
forecast.confidence
```

### Model Metadata

Example:

```json
{
  "prediction_engine": "MODEL_2_NEXT_STATION",
  "model2_prediction_min": 29.3,
  "model3_prediction_min": 61.8,
  "recent_delay_baseline_min": 58.2,
  "fallback_used": false,
  "fallback_reason": null
}
```

The frontend may use `prediction_engine` and `fallback_used` for explainability or admin views.

Do not use internal model values as the primary passenger-facing ETA.

### Provider Comparison

Example:

```json
{
  "provider_eta": "2026-09-01T17:09:00+05:30",
  "provider_delay_min": 29.0
}
```

This is comparison-only data.

The authoritative RailETA forecast remains:

```text
forecast.eta
```

### Backend Metadata

Live responses may include:

```json
{
  "provider_payload_cache": "MISS",
  "cache_ttl_seconds": 180
}
```

Cache state can be:

```text
MISS
HIT
```

This metadata should mainly be used for debugging/admin purposes.

## 5. Pre-departure Forecast

```http
POST /v1/forecast/predeparture
```

Purpose: estimate destination arrival delay before enough real station observations are available.

Model:

```text
Model 1 pre-departure LightGBM
```

Operational role:

```text
DESTINATION_DELAY_PRIOR
```

This endpoint is not a station-level live ETA endpoint.

### Pre-departure Request

Request sections:

```text
train
schedule
route
infrastructure
weather_risk
operations
```

Example:

```json
{
  "train": {
    "train_number": "12615",
    "train_type": "Express"
  },
  "schedule": {
    "year": 2024,
    "month": 8,
    "day_of_week": 2,
    "departure_hour": 10,
    "is_weekend": 0,
    "is_night_departure": 0,
    "is_peak_hour": 0,
    "is_festival_season": 0,
    "season": "Monsoon"
  },
  "route": {
    "zone": "SR",
    "zone_abbr": "SR",
    "source_station_category": "A1",
    "destination_station_category": "A1",
    "distance_km": 500,
    "num_scheduled_stops": 10,
    "scheduled_travel_hours": 8,
    "route_historical_ontime_pct": 75
  },
  "infrastructure": {
    "track_doubled": 1,
    "is_hdn_route": 0,
    "traction_type": "Electric (25kV AC)",
    "is_electrified": 1,
    "psr_count": 1,
    "is_circular_route": 0
  },
  "weather_risk": {
    "is_monsoon_season": 1,
    "is_fog_risk": 0,
    "fog_risk_score": 0.1,
    "zone_fog_index": 0.2,
    "zone_congestion_index": 0.3,
    "season_severity_score": 0.4
  },
  "operations": {
    "loco_age_years": 5,
    "coach_age_years": 4,
    "has_lhb_coaches": 1,
    "is_rake_shared": 0,
    "maintenance_score": 85,
    "seat_utilisation_pct": 80,
    "is_overloaded": 0,
    "late_incoming_rake": 0,
    "is_special_train": 0
  }
}
```

### Pre-departure Response

Important top-level fields:

```text
success
model
forecast
input_quality
limitations
```

Important forecast fields:

```text
predicted_destination_delay_min
lower_delay_min
upper_delay_min
interval_radius_min
risk_level
confidence
```

Risk levels:

```text
LOW
MODERATE
HIGH
SEVERE
```

Frontend must present this as a destination-delay prior, not a live station ETA.

## Error Handling

The backend exposes two main error categories.

### Request Validation Error

HTTP status:

```text
422
```

Example:

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": [
        "body",
        "train_number"
      ],
      "msg": "Value error, Train number must contain digits only.",
      "input": "ABC"
    }
  ]
}
```

Frontend can use the first `detail[].msg` as the validation message.

### Application / Provider Error

Example:

```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Provider unavailable.",
    "retryable": true,
    "details": {
      "source": "railradar"
    }
  }
}
```

Important error codes:

```text
JOURNEY_NOT_FOUND
PROVIDER_RATE_LIMITED
PROVIDER_UNAVAILABLE
PROVIDER_TIMEOUT
PROVIDER_CONFIGURATION_ERROR
PREDICTION_ERROR
INVALID_JOURNEY_STATE
```

Suggested frontend behavior:

* `JOURNEY_NOT_FOUND`: show journey unavailable.
* `PROVIDER_RATE_LIMITED`: allow retry later.
* `PROVIDER_TIMEOUT`: allow retry.
* `PROVIDER_UNAVAILABLE`: show live data unavailable and optionally offer Verified Demo.
* `PREDICTION_ERROR`: show controlled failure; never generate a fake ETA.

## Request ID

Every backend HTTP response includes:

```text
X-Request-ID
```

`api-client.ts` exposes this as:

```text
RailETAApiError.requestId
```

Use the request ID when displaying or reporting backend failures.

## Rate Limit

Current live endpoint limit:

```text
10 requests / minute / client
```

Exceeding this limit returns HTTP `429`.

Frontend should not aggressively poll the endpoint.

## CORS

Development origins:

```text
http://localhost:3000
http://127.0.0.1:3000
```

Production frontend origins should be configured through:

```text
CORS_ORIGINS
```

## Frontend Files

```text
docs/frontend/api-types.ts
docs/frontend/api-client.ts
docs/frontend/API_CONTRACT.md
```

Recommended integration:

```text
api-types.ts
-> api-client.ts
-> React / Next.js hooks
-> UI components
```

## Core Frontend Rule

Never calculate the RailETA prediction independently in the frontend.

Authoritative RailETA values are:

```text
forecast.eta
forecast.predicted_delay_min
```

Never substitute:

```text
comparison_only.provider_eta
```

as the RailETA model prediction.

## Runtime Strategy

Before departure:

```text
Model 1 -> destination delay prior
```

After running observations are available:

```text
Model 2 -> immediate next station
Model 3 -> later stations
```

The frontend UX should clearly distinguish these two operating stages.
