from unittest.mock import patch

from app.clients.openweather_forecast import (
    OpenWeatherForecastClient,
)


class FakeForecastResponse:
    def raise_for_status(
        self,
    ) -> None:
        return None

    def json(
        self,
    ) -> dict:
        return {
            "list": [
                {
                    "dt": 1788435000,

                    "main": {
                        "temp": 24.5,
                        "humidity": 88,
                    },

                    "weather": [
                        {
                            "description":
                                "moderate rain",
                        }
                    ],

                    "visibility": 3000,

                    "wind": {
                        "speed": 4.0,
                    },

                    "pop": 0.82,
                }
            ]
        }


@patch(
    "app.clients.openweather_forecast.httpx.get"
)
def test_openweather_forecast_client(
    mock_get,
):
    mock_get.return_value = (
        FakeForecastResponse()
    )

    client = (
        OpenWeatherForecastClient(
            api_key="test-key",
        )
    )

    result = (
        client.get_weather_at_eta(
            station_code="ET",
            station_name="Itarsi Jn",
            latitude=22.6085,
            longitude=77.7670,
            predicted_eta=(
                "2026-09-03T17:00:00+05:30"
            ),
        )
    )

    assert result.weather is not None

    assert (
        result.weather
        .temperature_c
        == 24.5
    )

    assert (
        result.weather
        .precipitation_probability_pct
        == 82.0
    )

    assert (
        result.weather.condition
        == "moderate rain"
    )

    assert (
        result.source
        == "OPENWEATHER_5DAY_3H"
    )



@patch(
    "app.clients.openweather_forecast.httpx.get"
)
def test_openweather_forecast_payload_cache(
    mock_get,
):
    mock_get.return_value = (
        FakeForecastResponse()
    )

    client = (
        OpenWeatherForecastClient(
            api_key="test-key",
        )
    )

    first = (
        client.get_weather_at_eta(
            station_code="CACHE_FORECAST",
            station_name="Cache Forecast Station",
            latitude=25.123,
            longitude=78.456,
            predicted_eta=(
                "2026-09-03T17:00:00+05:30"
            ),
        )
    )

    second = (
        client.get_weather_at_eta(
            station_code="CACHE_FORECAST",
            station_name="Cache Forecast Station",
            latitude=25.123,
            longitude=78.456,
            predicted_eta=(
                "2026-09-03T17:20:00+05:30"
            ),
        )
    )

    assert first.weather is not None
    assert second.weather is not None

    assert mock_get.call_count == 1