from unittest.mock import patch

from fastapi.testclient import TestClient
from tests.fixtures.live_response import (
    build_live_response,
)
from app.main import app
from app.core.errors import (
    JourneyNotFoundError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)

from app.schemas.responses import (
    LiveForecastResponse,
)


def test_live_forecast_success():
    expected = build_live_response()

    with TestClient(app) as client:
        with patch(
            "app.api.live_forecast."
            "LiveForecastService.get_live_forecast",
            return_value=expected,
        ) as mocked_service:
            response = client.post(
                "/v1/forecast/live",
                json={
                    "train_number": "12615",
                    "journey_date": "2026-09-01",
                },
            )

    assert response.status_code == 200

    validated_expected = (
        LiveForecastResponse(
            **expected
        ).model_dump(
            mode="json"
        )
    )

    assert (
        response.json()
        == validated_expected
    )

    mocked_service.assert_called_once()

    kwargs = (
        mocked_service.call_args.kwargs
    )

    assert kwargs["train_number"] == "12615"
    assert kwargs["journey_date"] == "2026-09-01"
    assert kwargs["artifacts"] is not None


def test_live_forecast_invalid_train_number():
    with TestClient(app) as client:
        response = client.post(
            "/v1/forecast/live",
            json={
                "train_number": "12AB",
                "journey_date": "2026-09-01",
            },
        )

    assert response.status_code == 422


def test_live_forecast_invalid_date():
    with TestClient(app) as client:
        response = client.post(
            "/v1/forecast/live",
            json={
                "train_number": "12615",
                "journey_date": "01-09-2026",
            },
        )

    assert response.status_code == 422


def test_live_forecast_journey_not_found():
    with TestClient(app) as client:
        with patch(
            "app.api.live_forecast."
            "LiveForecastService.get_live_forecast",
            side_effect=JourneyNotFoundError(
                "Requested train journey "
                "was not available."
            ),
        ):
            response = client.post(
                "/v1/forecast/live",
                json={
                    "train_number": "12615",
                    "journey_date": "2026-09-01",
                },
            )

    assert response.status_code == 404

    body = response.json()

    assert body["success"] is False
    assert body["error"]["code"] == (
        "JOURNEY_NOT_FOUND"
    )


def test_live_forecast_rate_limited():
    with TestClient(app) as client:
        with patch(
            "app.api.live_forecast."
            "LiveForecastService.get_live_forecast",
            side_effect=ProviderRateLimitError(
                "RailRadar rate limited."
            ),
        ):
            response = client.post(
                "/v1/forecast/live",
                json={
                    "train_number": "12615",
                },
            )

    assert response.status_code == 429

    body = response.json()

    assert body["error"]["code"] == (
        "PROVIDER_RATE_LIMITED"
    )

    assert body["error"]["retryable"] is True


def test_live_forecast_provider_unavailable():
    with TestClient(app) as client:
        with patch(
            "app.api.live_forecast."
            "LiveForecastService.get_live_forecast",
            side_effect=ProviderUnavailableError(
                "RailRadar unavailable."
            ),
        ):
            response = client.post(
                "/v1/forecast/live",
                json={
                    "train_number": "12615",
                },
            )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == (
        "PROVIDER_UNAVAILABLE"
    )


def test_live_forecast_timeout():
    with TestClient(app) as client:
        with patch(
            "app.api.live_forecast."
            "LiveForecastService.get_live_forecast",
            side_effect=ProviderTimeoutError(
                "RailRadar timed out."
            ),
        ):
            response = client.post(
                "/v1/forecast/live",
                json={
                    "train_number": "12615",
                },
            )

    assert response.status_code == 504
    assert response.json()["error"]["code"] == (
        "PROVIDER_TIMEOUT"
    )


def test_live_forecast_preserves_completed_journey_message():
    expected = build_live_response()

    expected["message"] = (
        "No upcoming stations are available "
        "for this journey."
    )

    expected["journey"][
        "upcoming_stations"
    ] = 0

    expected["journey"][
        "state_source"
    ] = (
        "NORMALIZED_LIVE_JOURNEY_"
        "NO_UPCOMING_STATIONS"
    )

    expected["predictions"] = []

    with TestClient(app) as client:
        with patch(
            "app.api.live_forecast."
            "LiveForecastService.get_live_forecast",
            return_value=expected,
        ):
            response = client.post(
                "/v1/forecast/live",
                json={
                    "train_number": "12183",
                    "journey_date": None,
                },
            )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True

    assert body["message"] == (
        "No upcoming stations are available "
        "for this journey."
    )

    assert (
        body["journey"]["upcoming_stations"]
        == 0
    )

    assert body["predictions"] == []


def test_live_forecast_preserves_insufficient_observation_message():
    expected = build_live_response()

    expected["message"] = (
        "Live journey data is available, "
        "but there are not yet enough "
        "verified observations for "
        "leakage-safe ML prediction."
    )

    expected["journey"][
        "observed_stations"
    ] = 0

    expected["journey"][
        "upcoming_stations"
    ] = 1

    expected["journey"][
        "state_source"
    ] = (
        "INSUFFICIENT_VERIFIED_"
        "OBSERVATIONS"
    )

    expected["predictions"] = []

    with TestClient(app) as client:
        with patch(
            "app.api.live_forecast."
            "LiveForecastService.get_live_forecast",
            return_value=expected,
        ):
            response = client.post(
                "/v1/forecast/live",
                json={
                    "train_number": "20172",
                    "journey_date": None,
                },
            )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True

    assert body["message"] == (
        "Live journey data is available, "
        "but there are not yet enough "
        "verified observations for "
        "leakage-safe ML prediction."
    )

    assert (
        body["journey"]["observed_stations"]
        == 0
    )

    assert (
        body["journey"]["upcoming_stations"]
        == 1
    )

    assert body["predictions"] == []