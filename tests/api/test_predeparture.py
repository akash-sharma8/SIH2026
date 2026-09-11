from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.errors import (
    JourneyNotFoundError,
)
from app.main import app

def build_valid_payload():
    return {
        "train_number": "12722",
        "journey_date": "2026-09-11",
    }


def build_feature_result():
    derived = {
        "train_number": "12722",
        "train_name": "Dakshin SF Express",
        "train_type": "Superfast Express",
        "train_category": "Express",
        "journey_status": "not-started",
        "year": 2026,
        "month": 9,
        "day_of_week": 4,
        "departure_hour": 22,
        "is_weekend": 0,
        "is_night_departure": 1,
        "is_peak_hour": 0,
        "season": "Monsoon",
        "distance_km": 1667.4,
        "num_scheduled_stops": 45,
        "scheduled_travel_hours": 29.0,
    }

    model_features = {
        "train_number":
            derived["train_number"],

        "train_type":
            derived["train_type"],

        "year":
            derived["year"],

        "month":
            derived["month"],

        "day_of_week":
            derived["day_of_week"],

        "departure_hour":
            derived["departure_hour"],

        "is_weekend":
            derived["is_weekend"],

        "is_night_departure":
            derived["is_night_departure"],

        "is_peak_hour":
            derived["is_peak_hour"],

        "season":
            derived["season"],

        "distance_km":
            derived["distance_km"],

        "num_scheduled_stops":
            derived["num_scheduled_stops"],

        "scheduled_travel_hours":
            derived["scheduled_travel_hours"],
    }

    return {
        "provider_payload": {
            "success": True,
        },
        "derived": derived,
        "model_features": model_features,
    }


@patch(
    "app.services.forecast."
    "build_predeparture_features"
)
def test_predeparture_endpoint_contract(
    mock_feature_builder,
):
    mock_feature_builder.return_value = (
        build_feature_result()
    )

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

    # Reduced feature coverage is expected for the
    # production-style pre-departure request.
    assert (
        body["forecast"]["confidence"]
        == "LOW"
    )

    journey = body["journey"]

    assert (
        journey["train_number"]
        == "12722"
    )

    assert (
        journey["train_name"]
        == "Dakshin SF Express"
    )

    assert (
        journey["train_type"]
        == "Superfast Express"
    )

    assert (
        journey["distance_km"]
        == 1667.4
    )

    assert (
        journey["num_scheduled_stops"]
        == 45
    )

    assert (
        journey["scheduled_travel_hours"]
        == 29.0
    )

    input_quality = (
        body["input_quality"]
    )

    assert (
        input_quality[
            "feature_completeness_pct"
        ]
        < 100.0
    )

    assert set(
        input_quality[
            "missing_critical_features"
        ]
    ) == {
        "late_incoming_rake",
        "season_severity_score",
        "route_historical_ontime_pct",
    }

    assert (
        input_quality[
            "unknown_categories"
        ]
        == {}
    )

    diagnostics = body["diagnostics"]

    assert diagnostics is not None

    explanation = (
        diagnostics[
            "prediction_explanation"
        ]
    )

    # Do not expose misleading SHAP factors when
    # important inputs are unavailable.
    assert (
        explanation[
            "explanation_available"
        ]
        is False
    )

    assert (
        explanation["factors"]
        == []
    )

    assert (
        explanation["source"]
        == "INSUFFICIENT_INPUT_COVERAGE"
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

    mock_feature_builder.assert_called_once()


def test_predeparture_missing_train_number_returns_422():
    payload = {
        "journey_date": "2026-09-11",
    }

    with TestClient(app) as client:
        response = client.post(
            "/v1/forecast/predeparture",
            json=payload,
        )

    assert response.status_code == 422


def test_predeparture_invalid_train_number_returns_422():
    payload = {
        "train_number": "ABC123",
        "journey_date": "2026-09-11",
    }

    with TestClient(app) as client:
        response = client.post(
            "/v1/forecast/predeparture",
            json=payload,
        )

    assert response.status_code == 422


def test_predeparture_invalid_date_returns_422():
    payload = {
        "train_number": "12722",
        "journey_date": "not-a-date",
    }

    with TestClient(app) as client:
        response = client.post(
            "/v1/forecast/predeparture",
            json=payload,
        )

    assert response.status_code == 422


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


@patch(
    "app.services.forecast."
    "build_predeparture_features"
)
def test_predeparture_running_train_is_rejected(
    mock_feature_builder,
):
    feature_result = build_feature_result()

    feature_result["derived"][
        "journey_status"
    ] = "running"

    mock_feature_builder.return_value = (
        feature_result
    )

    with TestClient(app) as client:
        response = client.post(
            "/v1/forecast/predeparture",
            json=build_valid_payload(),
        )

    assert response.status_code == 422

    body = response.json()

    assert body["success"] is False

    assert (
        body["error"]["code"]
        == "INVALID_JOURNEY_STATE"
    )

    assert (
        "currently running"
        in body["error"]["message"].lower()
    )

    assert (
        "running train section"
        in body["error"]["message"].lower()
    )

@patch(
    "app.services.forecast."
    "build_predeparture_features"
)
def test_predeparture_journey_not_found_preserves_404(
    mock_feature_builder,
):
    mock_feature_builder.side_effect = (
        JourneyNotFoundError(
            "Requested train journey "
            "was not available.",
            details={
                "http_status": 404,
                "provider_code":
                    "TRAIN_NOT_FOUND",
            },
        )
    )

    with TestClient(app) as client:
        response = client.post(
            "/v1/forecast/predeparture",
            json=build_valid_payload(),
        )

    assert response.status_code == 404

    body = response.json()

    assert body["success"] is False

    assert (
        body["error"]["code"]
        == "JOURNEY_NOT_FOUND"
    )

    assert (
        body["error"]["retryable"]
        is False
    )

    assert (
        body["error"]["details"][
            "provider_code"
        ]
        == "TRAIN_NOT_FOUND"
    )