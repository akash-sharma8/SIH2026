from unittest.mock import patch

from app.clients.openweather import (
    OpenWeatherClient,
)


class FakeResponse:
    def raise_for_status(
        self,
    ) -> None:
        return None

    def json(
        self,
    ) -> dict:
        return {
            "weather": [
                {
                    "description":
                        "light rain",
                }
            ],

            "main": {
                "temp": 27.2,
                "humidity": 84,
            },

            "visibility": 4000,

            "wind": {
                "speed": 5.0,
            },
        }


@patch(
    "app.clients.openweather.httpx.get"
)
def test_openweather_client(
    mock_get,
):
    mock_get.return_value = (
        FakeResponse()
    )

    client = OpenWeatherClient(
        api_key="test-key",
    )

    weather = (
        client.get_station_weather(
            station_code="GWL",
            station_name="Gwalior Jn",
            latitude=26.2162,
            longitude=78.1826,
        )
    )

    assert (
        weather.temperature_c
        == 27.2
    )

    assert (
        weather.visibility_km
        == 4.0
    )

    assert (
        weather.wind_kph
        == 18.0
    )

    assert (
        weather.condition
        == "light rain"
    )

    assert (
        weather.risk_level
        == "MODERATE"
    )

    assert (
        weather.source
        == "OPENWEATHER_CURRENT"
    )