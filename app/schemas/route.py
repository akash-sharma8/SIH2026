from typing import Literal

from pydantic import BaseModel

from app.schemas.station import StationCoordinates


class RouteStation(BaseModel):
    code: str
    name: str | None = None

    latitude: float
    longitude: float

    status: Literal[
        "PASSED",
        "CURRENT",
        "NEXT",
        "UPCOMING",
        "DESTINATION",
    ]

    stations_ahead: int | None = None


class TrainPosition(BaseModel):
    latitude: float
    longitude: float

    position_source: Literal[
        "REAL_PROVIDER_GPS",
        "ESTIMATED_BETWEEN_STATIONS",
        "CURRENT_STATION",
    ]

    accuracy_note: str | None = None


class RouteMap(BaseModel):
    source: StationCoordinates | None = None

    destination: StationCoordinates | None = None

    current_position: TrainPosition | None = None

    stations: list[RouteStation]