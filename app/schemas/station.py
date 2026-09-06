from pydantic import BaseModel


class StationCoordinates(BaseModel):
    code: str
    name: str | None = None

    latitude: float
    longitude: float

    source: str