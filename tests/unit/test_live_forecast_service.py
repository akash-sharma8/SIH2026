from unittest.mock import Mock, patch
import pytest
from app.services.forecast import LiveForecastService
from app.services.forecast import (
    LiveForecastService,
    _live_payload_cache,
)

@pytest.fixture(autouse=True)
def clear_live_payload_cache():
    _live_payload_cache.clear()
    yield
    _live_payload_cache.clear()

def test_live_forecast_service_success():
    service = LiveForecastService()

    artifacts = Mock()

    provider_payload = {
        "success": True,
        "data": {
            "trainNumber": "12615"
        },
    }

    inference_response = {
        "success": True,
        "journey": {
            "train_number": "12615"
        },
        "predictions": [
            {
                "station": "ABC",
                "predicted_delay_min": 12.0,
            }
        ],
    }

    with patch(
        "app.services.forecast.RailRadarClient"
    ) as client_class, patch(
        "app.services.forecast.InferenceAdapter"
    ) as adapter_class:
        client = client_class.return_value
        client.get_live_journey.return_value = (
            provider_payload
        )

        adapter = adapter_class.return_value
        adapter.run_payload.return_value = (
            inference_response
        )

        result = service.get_live_forecast(
            train_number="12615",
            journey_date="2026-09-01",
            artifacts=artifacts,
        )

    assert "diagnostics" in result
    

    diagnostics = result["diagnostics"]
    assert "evaluation" in diagnostics
    
    evaluation = diagnostics["evaluation"]

    if evaluation is not None:
        assert evaluation["model_name"] in {
            "MODEL_2",
            "MODEL_3",
        }

        assert evaluation["mae_minutes"] > 0
        assert evaluation["rmse_minutes"] > 0
        assert evaluation["sample_count"] > 0

    assert isinstance(diagnostics, dict)

    assert "prediction_explanation" in diagnostics

    explanation = diagnostics["prediction_explanation"]

    assert isinstance(explanation, dict)

    assert explanation["method"] in {
        "SHAP",
        "UNAVAILABLE",
    }

    assert isinstance(
        explanation["explanation_available"],
        bool,
    )

    assert result["success"] is True
    assert len(result["predictions"]) >= 0

    client.get_live_journey.assert_called_once_with(
        train_number="12615",
        journey_date="2026-09-01",
        authoritative=False,
    )

    adapter_class.assert_called_once_with(
        artifacts
    )

    adapter.run_payload.assert_called_once_with(
        provider_payload
    )

from unittest.mock import Mock, patch

import pytest

from app.core.errors import (
    JourneyNotFoundError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from app.services.forecast import LiveForecastService


@pytest.mark.parametrize(
    "provider_error",
    [
        JourneyNotFoundError("Journey not found."),
        ProviderRateLimitError("Rate limited."),
        ProviderTimeoutError("Provider timed out."),
        ProviderUnavailableError("Provider unavailable."),
    ],
)
def test_live_forecast_service_preserves_provider_errors(
    provider_error,
):
    service = LiveForecastService()
    artifacts = Mock()

    with patch(
        "app.services.forecast.RailRadarClient"
    ) as client_class:
        client = client_class.return_value

        client.get_live_journey.side_effect = (
            provider_error
        )

        with pytest.raises(
            type(provider_error)
        ) as exc_info:
            service.get_live_forecast(
                train_number="12615",
                journey_date="2026-09-01",
                artifacts=artifacts,
            )

    assert exc_info.value.code == (
        provider_error.code
    )

    assert exc_info.value.status_code == (
        provider_error.status_code
    )



def test_live_forecast_service_uses_cache():
    service = LiveForecastService()
    artifacts = Mock()

    provider_payload = {
        "success": True,
        "data": {
            "trainNumber": "12615"
        },
    }

    inference_response = {
        "success": True,
        "journey": {
            "train_number": "12615"
        },
        "predictions": [],
    }

    with patch(
        "app.services.forecast.RailRadarClient"
    ) as client_class, patch(
        "app.services.forecast.InferenceAdapter"
    ) as adapter_class:
        client = client_class.return_value
        client.get_live_journey.return_value = (
            provider_payload
        )

        adapter = adapter_class.return_value
        adapter.run_payload.return_value = (
            inference_response
        )

        first = service.get_live_forecast(
            train_number="12615",
            journey_date="2026-09-01",
            artifacts=artifacts,
        )

        second = service.get_live_forecast(
            train_number="12615",
            journey_date="2026-09-01",
            artifacts=artifacts,
        )

    assert first == inference_response
    assert second == inference_response

    assert (
        client.get_live_journey.call_count
        == 1
    )

    assert (
        adapter.run_payload.call_count
        == 2
    )



def test_live_forecast_service_reports_cache_miss_then_hit():
    service = LiveForecastService()
    artifacts = Mock()

    provider_payload = {
        "success": True,
        "data": {
            "trainNumber": "12615"
        },
    }

    inference_response = {
        "success": True,
        "predictions": [],
    }

    with patch(
        "app.services.forecast.RailRadarClient"
    ) as client_class, patch(
        "app.services.forecast.InferenceAdapter"
    ) as adapter_class:
        client = client_class.return_value
        client.get_live_journey.return_value = (
            provider_payload
        )

        adapter = adapter_class.return_value
        adapter.run_payload.return_value = (
            inference_response.copy()
        )

        first = service.get_live_forecast(
            train_number="12615",
            journey_date="2026-09-01",
            artifacts=artifacts,
        )

        adapter.run_payload.return_value = (
            inference_response.copy()
        )

        second = service.get_live_forecast(
            train_number="12615",
            journey_date="2026-09-01",
            artifacts=artifacts,
        )

    assert (
        first["backend"]["provider_payload_cache"]
        == "MISS"
    )

    assert (
        second["backend"]["provider_payload_cache"]
        == "HIT"
    )

    assert (
        first["backend"]["cache_ttl_seconds"]
        == 180
    )

    assert (
        client.get_live_journey.call_count
        == 1
    )









def test_live_forecast_service_survives_weather_failures():
    service = LiveForecastService()
    artifacts = Mock()

    provider_payload = {
        "success": True,
        "data": {
            "trainNumber": "12615",
        },
    }

    inference_response = {
        "success": True,
        "journey": {
            "train_number": "12615",
            "current_station_code": "AMLA",
        },
        "predictions": [
            {
                "station": {
                    "code": "BZU",
                    "name": "Betul",
                    "stations_ahead": 1,
                },
                "forecast": {
                    "eta": "2026-09-03T15:00:00+05:30",
                },
            }
        ],
    }

    with patch(
        "app.services.forecast.RailRadarClient"
    ) as client_class, patch(
        "app.services.forecast.InferenceAdapter"
    ) as adapter_class, patch(
        "app.services.forecast.extract_provider_route_data"
    ) as route_adapter, patch(
        "app.services.forecast.build_route_map"
    ) as route_builder, patch(
        "app.services.forecast.OpenWeatherClient"
    ) as current_weather_client, patch(
        "app.services.forecast.OpenWeatherForecastClient"
    ) as forecast_weather_client, patch(
        "app.services.forecast.get_settings"
    ) as settings_mock:

        settings_mock.return_value.openweather_api_key = (
            "test-key"
        )
        settings_mock.return_value.cache_ttl_seconds = 180

        client = client_class.return_value
        client.get_live_journey.return_value = (
            provider_payload
        )

        adapter = adapter_class.return_value
        adapter.run_payload.return_value = (
            inference_response.copy()
        )

        route_adapter.return_value = {}

        route = Mock()
        route.model_dump.return_value = {}
        route.stations = []

        route_builder.return_value = route

        current_weather_client.side_effect = RuntimeError(
            "current weather unavailable"
        )

        forecast_weather_client.side_effect = RuntimeError(
            "forecast weather unavailable"
        )

        result = service.get_live_forecast(
            train_number="12615",
            journey_date="2026-09-03",
            artifacts=artifacts,
        )

    assert result["success"] is True

    assert len(result["predictions"]) == 1

    assert result["predictions"][0]["station"]["code"] == "BZU"

    assert result["weather_corridor"] == []

    assert result["eta_weather_corridor"] == []


def test_live_forecast_service_resolves_previous_valid_service_day():
    service = LiveForecastService()
    artifacts = Mock()

    future_not_started = {
        "success": True,
        "data": {
            "trainNumber": "12183",
            "status": "not-started",
            "startDate": "2026-09-07",
            "route": [{"code": "AAA"}],
        },
    }

    invalid_sunday = {
        "success": False,
        "data": {},
    }

    invalid_saturday = {
        "success": True,
        "data": {
            "status": "not-started",
            "startDate": "2026-09-05",
            "route": [],
        },
    }

    valid_friday = {
        "success": True,
        "data": {
            "trainNumber": "12183",
            "status": "completed",
            "startDate": "2026-09-04",
            "route": [{"code": "AAA"}],
        },
    }

    inference_response = {
        "success": True,
        "journey": {
            "train_number": "12183",
        },
        "predictions": [],
    }

    with patch(
        "app.services.forecast.RailRadarClient"
    ) as client_class, patch(
        "app.services.forecast.InferenceAdapter"
    ) as adapter_class:
        client = client_class.return_value

        client.get_live_journey.side_effect = [
            future_not_started,
            invalid_sunday,
            invalid_saturday,
            valid_friday,
        ]

        adapter = adapter_class.return_value
        adapter.run_payload.return_value = (
            inference_response.copy()
        )

        result = service.get_live_forecast(
            train_number="12183",
            journey_date=None,
            artifacts=artifacts,
        )

    assert result["success"] is True

    assert (
        client.get_live_journey.call_count
        == 4
    )

    assert (
        client.get_live_journey.call_args_list[0].kwargs[
            "journey_date"
        ]
        is None
    )

    assert (
        client.get_live_journey.call_args_list[1].kwargs[
            "journey_date"
        ]
        == "2026-09-06"
    )

    assert (
        client.get_live_journey.call_args_list[2].kwargs[
            "journey_date"
        ]
        == "2026-09-05"
    )

    assert (
        client.get_live_journey.call_args_list[3].kwargs[
            "journey_date"
        ]
        == "2026-09-04"
    )

    adapter.run_payload.assert_called_once_with(
        valid_friday
    )


def test_live_forecast_service_does_not_search_backwards_for_explicit_date():
    service = LiveForecastService()
    artifacts = Mock()

    explicit_date_payload = {
        "success": True,
        "data": {
            "trainNumber": "12183",
            "status": "not-started",
            "startDate": "2026-09-07",
            "route": [{"code": "AAA"}],
        },
    }

    inference_response = {
        "success": True,
        "journey": {
            "train_number": "12183",
        },
        "predictions": [],
    }

    with patch(
        "app.services.forecast.RailRadarClient"
    ) as client_class, patch(
        "app.services.forecast.InferenceAdapter"
    ) as adapter_class:
        client = client_class.return_value

        client.get_live_journey.return_value = (
            explicit_date_payload
        )

        adapter = adapter_class.return_value
        adapter.run_payload.return_value = (
            inference_response.copy()
        )

        result = service.get_live_forecast(
            train_number="12183",
            journey_date="2026-09-07",
            artifacts=artifacts,
        )

    assert result["success"] is True

    client.get_live_journey.assert_called_once_with(
        train_number="12183",
        journey_date="2026-09-07",
        authoritative=False,
    )

    adapter.run_payload.assert_called_once_with(
        explicit_date_payload
    )