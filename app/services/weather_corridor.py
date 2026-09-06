from app.clients.weather import WeatherClient
from app.schemas.route import RouteMap
from app.schemas.weather import StationWeather
from app.services.cache import TTLCache
from concurrent.futures import (
    ThreadPoolExecutor,
)


_weather_cache = TTLCache(
    ttl_seconds=600
)


class WeatherCorridorService:
    def __init__(
        self,
        client: WeatherClient,
        *,
        max_stations: int = 8,
    ) -> None:
        self._client = client
        self._max_stations = max_stations




    def _fetch_station_weather(
        self,
        station,
    ) -> StationWeather | None:

        cache_key = (
            f"weather:"
            f"{station.code}:"
            f"{round(station.latitude, 3)}:"
            f"{round(station.longitude, 3)}"
        )

        cached_weather = (
            _weather_cache.get(
                cache_key
            )
        )

        if cached_weather is not None:
            return cached_weather

        try:
            weather = (
                self._client
                .get_station_weather(
                    station_code=station.code,
                    station_name=station.name,
                    latitude=station.latitude,
                    longitude=station.longitude,
                )
            )

            _weather_cache.set(
                cache_key,
                weather,
            )

            return weather

        except Exception:
            return None

    def build_corridor(
        self,
        route: RouteMap,
    ) -> list[StationWeather]:
        results: list[StationWeather] = []

        candidates = [
            station
            for station in route.stations
            if station.status
            in {
                "NEXT",
                "UPCOMING",
                "DESTINATION",
            }
        ][: self._max_stations]

        if not candidates:
            return []

        with ThreadPoolExecutor(
            max_workers=min(
                8,
                len(candidates),
            )
        ) as executor:

            futures = [
                executor.submit(
                    self._fetch_station_weather,
                    station,
                )
                for station in candidates
            ]

            results = [
                result
                for future in futures
                if (
                    result := future.result()
                ) is not None
            ]

        return results