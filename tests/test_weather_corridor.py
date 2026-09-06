from app.clients.weather_stub import (
    StubWeatherClient,
)
from app.schemas.route import (
    RouteMap,
    RouteStation,
)
from app.services.weather_corridor import (
    WeatherCorridorService,
)


def test_weather_corridor():
    route = RouteMap(
        source=None,
        destination=None,
        current_position=None,
        stations=[
            RouteStation(
                code="AMLA",
                name="Amla Jn",
                latitude=21.91,
                longitude=78.12,
                status="NEXT",
                stations_ahead=1,
            ),
            RouteStation(
                code="BZU",
                name="Betul",
                latitude=21.89,
                longitude=77.90,
                status="UPCOMING",
                stations_ahead=2,
            ),
            RouteStation(
                code="NDLS",
                name="New Delhi",
                latitude=28.64,
                longitude=77.22,
                status="DESTINATION",
                stations_ahead=3,
            ),
        ],
    )

    service = WeatherCorridorService(
        StubWeatherClient(),
        max_stations=2,
    )

    result = service.build_corridor(
        route
    )

    assert len(result) == 2

    assert (
        result[0].station_code
        == "AMLA"
    )

    assert (
        result[1].station_code
        == "BZU"
    )


class FailingWeatherClient:
    def get_station_weather(
        self,
        **kwargs,
    ):
        raise RuntimeError(
            "weather unavailable"
        )


def test_weather_corridor_partial_failure():
    route = RouteMap(
        source=None,
        destination=None,
        current_position=None,
        stations=[
            RouteStation(
                code="FAIL1",
                name="Failure Test Station",
                latitude=21.91,
                longitude=78.12,
                status="NEXT",
                stations_ahead=1,
            ),
        ],
    )

    service = WeatherCorridorService(
        FailingWeatherClient(),
    )

    result = service.build_corridor(
        route
    )

    assert result == []



from app.schemas.weather import (
    StationWeather,
)


class CountingWeatherClient:
    def __init__(self):
        self.calls = 0

    def get_station_weather(
        self,
        *,
        station_code: str,
        station_name: str | None,
        latitude: float,
        longitude: float,
    ) -> StationWeather:

        self.calls += 1

        return StationWeather(
            station_code=station_code,
            station_name=station_name,
            latitude=latitude,
            longitude=longitude,

            temperature_c=25.0,
            condition="clear sky",

            precipitation_probability_pct=None,
            visibility_km=10.0,
            wind_kph=8.0,
            humidity_pct=60.0,

            risk_level="LOW",

            source="TEST_WEATHER",
        )


def test_weather_corridor_uses_cache():
    route = RouteMap(
        source=None,
        destination=None,
        current_position=None,

        stations=[
            RouteStation(
                code="CACHE1",
                name="Cache Test Station",
                latitude=25.111,
                longitude=78.222,
                status="NEXT",
                stations_ahead=1,
            ),
        ],
    )

    client = CountingWeatherClient()

    service = WeatherCorridorService(
        client,
        max_stations=1,
    )

    first = service.build_corridor(
        route
    )

    second = service.build_corridor(
        route
    )

    assert len(first) == 1
    assert len(second) == 1

    assert client.calls == 1