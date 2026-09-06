from app.schemas.weather import (
    StationWeather,
)
from app.services.weather_risk import (
    classify_weather_risk,
)


class StubWeatherClient:
    def get_station_weather(
        self,
        *,
        station_code: str,
        station_name: str | None,
        latitude: float,
        longitude: float,
    ) -> StationWeather:

        precipitation = 75.0
        visibility_km = 6.0
        wind_kph = 12.0

        return StationWeather(
            station_code=station_code,
            station_name=station_name,
            latitude=latitude,
            longitude=longitude,

            temperature_c=27.0,
            condition="Rain",

            precipitation_probability_pct=(
                precipitation
            ),
            visibility_km=visibility_km,
            wind_kph=wind_kph,
            humidity_pct=82.0,

            risk_level=(
                classify_weather_risk(
                    precipitation_probability_pct=(
                        precipitation
                    ),
                    visibility_km=(
                        visibility_km
                    ),
                    wind_kph=(
                        wind_kph
                    ),
                )
            ),

            source="STUB_WEATHER",
        )