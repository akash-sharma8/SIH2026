from fastapi.testclient import TestClient

from app.main import app


def build_valid_payload():
    return {
        "train": {
            "train_number": "12615",
            "train_type": "Express",
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

            "season": "Monsoon",
        },

        "route": {
            "zone": "SR",
            "zone_abbr": "SR",

            "source_station_category": "A1",
            "destination_station_category": "A1",

            "distance_km": 500.0,
            "num_scheduled_stops": 10,
            "scheduled_travel_hours": 8.0,

            "route_historical_ontime_pct": 75.0,
        },

        "infrastructure": {
            "track_doubled": 1,
            "is_hdn_route": 0,

            "traction_type": "Electric (25kV AC)",

            "is_electrified": 1,
            "psr_count": 1,

            "is_circular_route": 0,
        },

        "weather_risk": {
            "is_monsoon_season": 1,
            "is_fog_risk": 0,

            "fog_risk_score": 0.1,
            "zone_fog_index": 0.2,
            "zone_congestion_index": 0.3,
            "season_severity_score": 0.4,
        },

        "operations": {
            "loco_age_years": 5.0,
            "coach_age_years": 4.0,

            "has_lhb_coaches": 1,
            "is_rake_shared": 0,

            "maintenance_score": 85.0,
            "seat_utilisation_pct": 80.0,

            "is_overloaded": 0,
            "late_incoming_rake": 0,
            "is_special_train": 0,
        },
    }


def test_predeparture_endpoint_contract():
    with TestClient(app) as client:
        response = client.post(
            "/v1/forecast/predeparture",
            json=build_valid_payload(),
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True

    assert (
        body["model"]["role"]
        == "DESTINATION_DELAY_PRIOR"
    )

    assert (
        body["model"]["name"]
        == "Model 1 pre-departure LightGBM"
    )

    assert (
        body["forecast"][
            "predicted_destination_delay_min"
        ]
        >= 0
    )

    assert (
        body["forecast"]["risk_level"]
        in {
            "LOW",
            "MODERATE",
            "HIGH",
            "SEVERE",
        }
    )

    assert body["forecast"]["confidence"] in {
        "LOW",
        "MEDIUM",
    }

    assert (
        body["input_quality"][
            "feature_completeness_pct"
        ]
        == 100.0
    )

    assert (
        body["input_quality"][
            "missing_critical_features"
        ]
        == []
    )
    assert "diagnostics" in body
    assert body["diagnostics"] is not None

    diagnostics = body["diagnostics"]

    assert (
        "prediction_explanation"
        in diagnostics
    )

    assert "evaluation" in diagnostics

    explanation = (
        diagnostics[
            "prediction_explanation"
        ]
    )

    assert isinstance(
        explanation,
        dict,
    )

    assert (
        explanation["method"]
        in {
            "SHAP",
            "UNAVAILABLE",
        }
    )

    assert isinstance(
        explanation[
            "explanation_available"
        ],
        bool,
    )

    evaluation = (
        diagnostics["evaluation"]
    )

    if evaluation is not None:
        assert (
            evaluation["model_name"]
            == "MODEL_1"
        )

        assert (
            evaluation["mae_minutes"]
            > 0
        )

        assert (
            evaluation["rmse_minutes"]
            > 0
        )

        assert (
            evaluation["sample_count"]
            > 0
        )



def test_predeparture_missing_critical_feature_returns_422():
    payload = build_valid_payload()

    del payload["train"]["train_number"]

    with TestClient(app) as client:
        response = client.post(
            "/v1/forecast/predeparture",
            json=payload,
        )

    assert response.status_code == 422

    body = response.json()

    assert "detail" in body


def test_predeparture_unknown_category_returns_low_confidence():
    payload = build_valid_payload()

    payload["train"]["train_type"] = "UNKNOWN_TRAIN_TYPE"

    with TestClient(app) as client:
        response = client.post(
            "/v1/forecast/predeparture",
            json=payload,
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True

    assert (
        body["forecast"]["confidence"]
        == "LOW"
    )

    assert (
        body["input_quality"][
            "unknown_categories"
        ]["train_type"]
        == "UNKNOWN_TRAIN_TYPE"
    )

from unittest.mock import patch


def test_predeparture_rate_limited():
    payload = build_valid_payload()

    with patch(
        "app.api.predeparture."
        "_predeparture_rate_limiter.allow",
        return_value=False,
    ):
        with TestClient(app) as client:
            response = client.post(
                "/v1/forecast/predeparture",
                json=payload,
            )

    assert response.status_code == 429

    body = response.json()

    assert body["success"] is False

    assert (
        body["error"]["code"]
        == "PROVIDER_RATE_LIMITED"
    )

    assert (
        body["error"]["retryable"]
        is True
    )