from typing import Literal

from pydantic import BaseModel


class StationWeather(BaseModel):
    station_code: str
    station_name: str | None = None

    latitude: float
    longitude: float

    temperature_c: float | None = None
    condition: str | None = None

    precipitation_probability_pct: float | None = None
    visibility_km: float | None = None
    wind_kph: float | None = None
    humidity_pct: float | None = None

    risk_level: Literal[
        "LOW",
        "MODERATE",
        "HIGH",
        "SEVERE",
        "UNKNOWN",
    ] = "UNKNOWN"

    source: str