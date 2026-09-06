from datetime import datetime, timezone
from typing import Any

import httpx
from app.services.cache import TTLCache
from app.schemas.weather import (
    StationWeather,
)
from app.schemas.weather_forecast import (
    StationWeatherAtETA,
)
from app.services.weather_risk import (
    classify_weather_risk,
)
from app.services.weather_time import (
    find_nearest_forecast,
)

_forecast_payload_cache = TTLCache(
    ttl_seconds=600
)

class OpenWeatherForecastClient:
    def __init__(
        self,
        *,
        api_key: str,
        timeout_seconds: float = 5.0,
    ) -> None:
        self._api_key = api_key
        self._timeout_seconds = timeout_seconds

    def get_weather_at_eta(
        self,
        *,
        station_code: str,
        station_name: str | None,
        latitude: float,
        longitude: float,
        predicted_eta: str,
    ) -> StationWeatherAtETA:

        cache_key = (
            f"forecast:"
            f"{round(latitude, 3)}:"
            f"{round(longitude,3)}"
        )

        payload = _forecast_payload_cache.get(
            cache_key
        )

        if payload is None:
            response = httpx.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={
                    "lat": latitude,
                    "lon": longitude,
                    "appid": self._api_key,
                    "units": "metric",
                },
                timeout=self._timeout_seconds,
            )

            response.raise_for_status()

            payload =  response.json()
        
            _forecast_payload_cache.set(
                cache_key,
                payload,
            )

        raw_items = payload.get(
            "list",
            [],
        )

        normalized_forecasts: list[
            dict[str, Any]
        ] = []

        if isinstance(
            raw_items,
            list,
        ):
            for item in raw_items:
                if not isinstance(
                    item,
                    dict,
                ):
                    continue

                timestamp = item.get(
                    "dt"
                )

                if timestamp is None:
                    continue

                forecast_time = (
                    datetime.fromtimestamp(
                        float(timestamp),
                        tz=timezone.utc,
                    ).isoformat()
                )

                normalized_forecasts.append(
                    {
                        "forecast_time":
                            forecast_time,
                        "payload":
                            item,
                    }
                )

        nearest = find_nearest_forecast(
            predicted_eta=predicted_eta,
            forecasts=normalized_forecasts,
        )

        if nearest is None:
            return StationWeatherAtETA(
                station_code=station_code,
                station_name=station_name,
                predicted_eta=predicted_eta,
                forecast_time=None,
                weather=None,
                time_difference_minutes=None,
                source=(
                    "OPENWEATHER_5DAY_3H"
                ),
            )

        item = nearest.get(
            "payload",
            {},
        )

        main = item.get(
            "main",
            {},
        )

        wind = item.get(
            "wind",
            {},
        )

        weather_items = item.get(
            "weather",
            [],
        )

        visibility_m = item.get(
            "visibility"
        )

        probability = item.get(
            "pop"
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
            float(main["temp"])
            if (
                isinstance(
                    main,
                    dict,
                )
                and main.get(
                    "temp"
                ) is not None
            )
            else None
        )

        humidity_pct = (
            float(main["humidity"])
            if (
                isinstance(
                    main,
                    dict,
                )
                and main.get(
                    "humidity"
                ) is not None
            )
            else None
        )

        visibility_km = (
            float(visibility_m)
            / 1000.0
            if visibility_m is not None
            else None
        )

        wind_kph = (
            float(
                wind["speed"]
            )
            * 3.6
            if (
                isinstance(
                    wind,
                    dict,
                )
                and wind.get(
                    "speed"
                ) is not None
            )
            else None
        )

        precipitation_probability_pct = (
            float(probability)
            * 100.0
            if probability is not None
            else None
        )

        risk_level = (
            classify_weather_risk(
                precipitation_probability_pct=(
                    precipitation_probability_pct
                ),
                visibility_km=(
                    visibility_km
                ),
                wind_kph=(
                    wind_kph
                ),
            )
        )

        weather = StationWeather(
            station_code=station_code,
            station_name=station_name,
            latitude=latitude,
            longitude=longitude,

            temperature_c=temperature_c,
            condition=condition,

            precipitation_probability_pct=(
                precipitation_probability_pct
            ),

            visibility_km=visibility_km,
            wind_kph=wind_kph,
            humidity_pct=humidity_pct,

            risk_level=risk_level,

            source="OPENWEATHER_FORECAST",
        )

        predicted_dt = (
            datetime.fromisoformat(
                predicted_eta
            )
        )

        forecast_dt = (
            datetime.fromisoformat(
                str(
                    nearest[
                        "forecast_time"
                    ]
                )
            )
        )

        difference_minutes = abs(
            (
                predicted_dt
                - forecast_dt
            ).total_seconds()
        ) / 60.0

        return StationWeatherAtETA(
            station_code=station_code,
            station_name=station_name,

            predicted_eta=predicted_eta,

            forecast_time=(
                nearest[
                    "forecast_time"
                ]
            ),

            weather=weather,

            time_difference_minutes=(
                round(
                    difference_minutes,
                    1,
                )
            ),

            source=(
                "OPENWEATHER_5DAY_3H"
            ),
        )