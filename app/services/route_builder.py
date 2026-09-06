from app.schemas.station import StationCoordinates
from app.services.station_coordinates import (
    get_station_coordinates,
)


def build_route_coordinates(
    station_codes: list[str],
) -> list[StationCoordinates]:
    route: list[StationCoordinates] = []

    for code in station_codes:
        station = get_station_coordinates(code)

        if station is not None:
            route.append(station)

    return route