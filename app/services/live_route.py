from typing import Any

from app.schemas.station import (
    StationCoordinates,
)
from app.services.route_builder import (
    build_route_coordinates,
)


def build_live_route_from_predictions(
    predictions: list[Any],
) -> list[StationCoordinates]:
    station_codes: list[str] = []

    for prediction in predictions:
        station = getattr(
            prediction,
            "station",
            None,
        )

        if station is None:
            continue

        code = getattr(
            station,
            "code",
            None,
        )

        if not code:
            continue

        station_codes.append(
            str(code),
        )

    return build_route_coordinates(
        station_codes,
    )