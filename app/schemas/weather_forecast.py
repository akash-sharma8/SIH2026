from pydantic import BaseModel

from app.schemas.weather import (
    StationWeather,
)


class StationWeatherAtETA(BaseModel):
    station_code: str
    station_name: str | None = None

    predicted_eta: str

    forecast_time: str | None = None

    weather: StationWeather | None = None

    time_difference_minutes: float | None = None

    source: str