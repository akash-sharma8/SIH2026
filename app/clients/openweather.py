from typing import Any

import httpx

from app.schemas.weather import (
    StationWeather,
)
from app.services.weather_risk import (
    classify_weather_risk,
)


class OpenWeatherClient:
    def __init__(
        self,
        *,
        api_key: str,
        timeout_seconds: float = 5.0,
    ) -> None:
        self._api_key = api_key
        self._timeout_seconds = (
            timeout_seconds
        )

    def get_station_weather(
        self,
        *,
        station_code: str,
        station_name: str | None,
        latitude: float,
        longitude: float,
    ) -> StationWeather:

        response = httpx.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "lat": latitude,
                "lon": longitude,
                "appid": self._api_key,
                "units": "metric",
            },
            timeout=self._timeout_seconds,
        )

        response.raise_for_status()

        payload: dict[str, Any] = (
            response.json()
        )

        main = payload.get(
            "main",
            {},
        )

        weather_items = payload.get(
            "weather",
            [],
        )

        wind = payload.get(
            "wind",
            {},
        )

        visibility_m = payload.get(
            "visibility"
        )

        condition = None

        if (
            isinstance(
                weather_items,
                list,
            )
            and weather_items
            and isinstance(
                weather_items[0],
                dict,
            )
        ):
            condition = (
                weather_items[0]
                .get("description")
            )

        temperature_c = (
            float(
                main.get(
                    "temp"
                )
            )
            if isinstance(
                main,
                dict,
            )
            and main.get(
                "temp"
            ) is not None
            else None
        )

        humidity_pct = (
            float(
                main.get(
                    "humidity"
                )
            )
            if isinstance(
                main,
                dict,
            )
            and main.get(
                "humidity"
            ) is not None
            else None
        )

        visibility_km = (
            float(
                visibility_m
            ) / 1000.0
            if visibility_m is not None
            else None
        )

        wind_kph = None

        if (
            isinstance(
                wind,
                dict,
            )
            and wind.get(
                "speed"
            ) is not None
        ):
            wind_kph = (
                float(
                    wind["speed"]
                )
                * 3.6
            )

        risk_level = (
            classify_weather_risk(
                precipitation_probability_pct=None,
                visibility_km=visibility_km,
                wind_kph=wind_kph,
            )
        )

        return StationWeather(
            station_code=station_code,
            station_name=station_name,
            latitude=latitude,
            longitude=longitude,

            temperature_c=temperature_c,
            condition=condition,

            precipitation_probability_pct=None,
            visibility_km=visibility_km,
            wind_kph=wind_kph,
            humidity_pct=humidity_pct,

            risk_level=risk_level,

            source="OPENWEATHER_CURRENT",
        )