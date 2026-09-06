from app.schemas.route import (
    RouteMap,
    RouteStation,
)
from app.schemas.weather import (
    StationWeather,
)
from app.schemas.weather_forecast import (
    StationWeatherAtETA,
)
from app.services.eta_weather_corridor import (
    ETAWeatherCorridorService,
)


class StubForecastClient:
    def get_weather_at_eta(
        self,
        *,
        station_code: str,
        station_name: str | None,
        latitude: float,
        longitude: float,
        predicted_eta: str,
    ) -> StationWeatherAtETA:

        return StationWeatherAtETA(
            station_code=station_code,
            station_name=station_name,
            predicted_eta=predicted_eta,
            forecast_time=predicted_eta,

            weather=StationWeather(
                station_code=station_code,
                station_name=station_name,
                latitude=latitude,
                longitude=longitude,

                temperature_c=24.0,
                condition="rain",

                precipitation_probability_pct=80,
                visibility_km=5.0,
                wind_kph=15.0,
                humidity_pct=85,

                risk_level="MODERATE",
                source="TEST_FORECAST",
            ),

            time_difference_minutes=0.0,
            source="TEST_FORECAST",
        )


def test_eta_weather_corridor():
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
        ],
    )

    predictions = [
        {
            "station": {
                "code": "AMLA",
            },
            "forecast": {
                "eta":
                    "2026-09-03T14:00:00+05:30",
            },
        },
        {
            "station": {
                "code": "BZU",
            },
            "forecast": {
                "eta":
                    "2026-09-03T15:00:00+05:30",
            },
        },
    ]

    service = (
        ETAWeatherCorridorService(
            StubForecastClient(),
            max_stations=8,
        )
    )

    result = service.build_corridor(
        route=route,
        predictions=predictions,
    )

    assert len(result) == 2

    assert (
        result[0].station_code
        == "AMLA"
    )

    assert (
        result[0].weather
        is not None
    )

    assert (
        result[0]
        .weather
        .risk_level
        == "MODERATE"
    )

    assert (
        result[1].station_code
        == "BZU"
    )


class FailingForecastClient:
    def get_weather_at_eta(
        self,
        **kwargs,
    ):
        raise RuntimeError(
            "forecast unavailable"
        )


def test_eta_weather_corridor_partial_failure():
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
        ],
    )

    predictions = [
        {
            "station": {
                "code": "AMLA",
            },
            "forecast": {
                "eta":
                    "2026-09-03T14:00:00+05:30",
            },
        },
    ]

    service = (
        ETAWeatherCorridorService(
            FailingForecastClient(),
        )
    )

    result = service.build_corridor(
        route=route,
        predictions=predictions,
    )

    assert result == []