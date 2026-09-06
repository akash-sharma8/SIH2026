from typing import Any

from app.clients.weather import (
    WeatherForecastClient,
)
from app.schemas.route import RouteMap
from app.schemas.weather_forecast import (
    StationWeatherAtETA,
)
from concurrent.futures import (
    ThreadPoolExecutor,
)

def _get_value(
    value: Any,
    key: str,
    default: Any = None,
) -> Any:
    if isinstance(value, dict):
        return value.get(
            key,
            default,
        )

    return getattr(
        value,
        key,
        default,
    )


class ETAWeatherCorridorService:
    def __init__(
        self,
        client: WeatherForecastClient,
        *,
        max_stations: int = 8,
    ) -> None:
        self._client = client
        self._max_stations = max_stations

    def _fetch_station_weather(
    self,
    *,
    route_station,
    eta: str,
    ) -> StationWeatherAtETA | None:
        try:
            return (
                self._client
                .get_weather_at_eta(
                    station_code=(
                        route_station.code
                    ),
                    station_name=(
                        route_station.name
                    ),
                    latitude=(
                        route_station.latitude
                    ),
                    longitude=(
                        route_station.longitude
                    ),
                    predicted_eta=eta,
                )
            )

        except Exception:
            return None




    def build_corridor(
        self,
        *,
        route: RouteMap,
        predictions: list[Any],
    ) -> list[StationWeatherAtETA]:

        route_station_map = {
            station.code: station
            for station in route.stations
        }


        jobs = []

        for prediction in predictions:
            if len(jobs) >= self._max_stations:
                break

            station = _get_value(
                prediction,
                "station",
            )

            forecast = _get_value(
                prediction,
                "forecast",
            )

            if (
                station is None
                or forecast is None
            ):
                continue

            code = _get_value(
                station,
                "code",
            )

            eta = _get_value(
                forecast,
                "eta",
            )

            if not code or not eta:
                continue

            route_station = (
                route_station_map.get(
                    str(code)
                )
            )

            if route_station is None:
                continue

            jobs.append(
                (
                    route_station,
                    str(eta),
                )
            )

        if not jobs:
            return []



        with ThreadPoolExecutor(
            max_workers=min(
                8,
                len(jobs),
            )
        ) as executor:

            futures = [
                executor.submit(
                    self._fetch_station_weather,
                    route_station=route_station,
                    eta=eta,
                )
                for route_station, eta
                in jobs
            ]

            results = [
                result
                for future in futures
                if (
            result := future.result()
                ) is not None
            ]

        return results

