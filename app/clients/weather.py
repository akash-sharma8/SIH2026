from typing import Protocol

from app.schemas.weather import (
    StationWeather,
)

from app.schemas.weather_forecast import (
    StationWeatherAtETA,
)


class WeatherClient(Protocol):
    def get_station_weather(
        self,
        *,
        station_code: str,
        station_name: str | None,
        latitude: float,
        longitude: float,
    ) -> StationWeather:
        ...




class WeatherForecastClient(Protocol):
    def get_weather_at_eta(
        self,
        *,
        station_code: str,
        station_name: str | None,
        latitude: float,
        longitude: float,
        predicted_eta: str,
    ) -> StationWeatherAtETA:
        ...