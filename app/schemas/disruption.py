from pydantic import (
    BaseModel,
    Field,
)


class DisruptionStation(BaseModel):
    code: str | None = None
    name: str | None = None


class TrainDisruptionAlert(BaseModel):
    type: str
    severity: str

    title: str
    message: str

    from_station: (
        DisruptionStation
        | None
    ) = None

    to_station: (
        DisruptionStation
        | None
    ) = None

    affected_stations: list[
        DisruptionStation
    ] = Field(
        default_factory=list
    )

    source: str = "RAILRADAR"