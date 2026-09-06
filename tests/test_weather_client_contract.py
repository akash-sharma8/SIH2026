from app.clients.weather_stub import (
    StubWeatherClient,
)


def test_weather_client_contract():
    client = StubWeatherClient()

    weather = (
        client.get_station_weather(
            station_code="GWL",
            station_name="Gwalior Jn",
            latitude=26.2162,
            longitude=78.1826,
        )
    )

    assert weather.station_code == "GWL"
    assert weather.condition == "Rain"

    assert (
        weather.risk_level
        == "MODERATE"
    )

    assert (
        weather.source
        == "STUB_WEATHER"
    )