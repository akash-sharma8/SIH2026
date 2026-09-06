from typing import Any
from app.schemas.route import (
    RouteMap,
    RouteStation,
    TrainPosition,
)
from app.schemas.station import (
    StationCoordinates,
)
from app.services.station_coordinates import (
    get_station_coordinates,
)

def _get_value(
    value: Any,
    key: str,
    default: Any = None,
) -> Any:
    if isinstance(value, dict):
        return value.get(
            key,
            default,
        )

    return getattr(
        value,
        key,
        default,
    )


def build_route_map(
    *,
    current_station_code: str | None,
    predictions: list[Any],
    provider_route_data: dict[str, Any] | None = None,
) -> RouteMap:

    provider_route_data = (
        provider_route_data
        if isinstance(
            provider_route_data,
            dict,
        )
        else {}
    )

    provider_stations = (
        provider_route_data.get(
            "route",
            [],
        )
    )

    provider_station_map: dict[
        str,
        dict[str, Any],
    ] = {}

    if isinstance(
        provider_stations,
        list,
    ):
        for station in provider_stations:
            if not isinstance(
                station,
                dict,
            ):
                continue

            code = station.get(
                "code"
            )

            if not code:
                continue

            provider_station_map[
                str(code).strip().upper()
            ] = station

    route_stations: list[RouteStation] = []

    current_coordinates = None

    if current_station_code:
        current_coordinates = (
            get_station_coordinates(
                current_station_code,
            )
        )

    if current_coordinates is not None:
        route_stations.append(
            RouteStation(
                code=current_coordinates.code,
                name=current_coordinates.name,
                latitude=current_coordinates.latitude,
                longitude=current_coordinates.longitude,
                status="CURRENT",
                stations_ahead=0,
            )
        )

    valid_prediction_stations: list[
        tuple[Any, Any]
    ] = []

    for prediction in predictions:
        station = _get_value(
            prediction,
            "station",
        )

        if station is None:
            continue

        code = _get_value(
            station,
            "code",
        )

        if not code:
            continue

        normalized_code = (
            str(code)
            .strip()
            .upper()
        )

        provider_station = (
            provider_station_map.get(
                normalized_code
            )
        )

        coordinates = None

        if provider_station is not None:
            latitude = provider_station.get(
                "latitude"
            )

            longitude = provider_station.get(
                "longitude"
            )

            if (
                latitude is not None
                and longitude is not None
            ):
                coordinates = StationCoordinates(
                    code=normalized_code,
                    name=provider_station.get(
                        "name"
                    ),
                    latitude=float(
                        latitude
                    ),
                    longitude=float(
                        longitude
                    ),
                    source="RAILRADAR_ROUTE",
                )

        if coordinates is None:
            coordinates = (
                get_station_coordinates(
                    normalized_code
                )
            )

        if coordinates is None:
            continue

        valid_prediction_stations.append(
            (
                prediction,
                coordinates,
            )
        )

    last_index = (
        len(valid_prediction_stations) - 1
    )

    for index, (
        prediction,
        coordinates,
    ) in enumerate(
        valid_prediction_stations
    ):
        station = _get_value(
            prediction,
            "station",
        )

        stations_ahead = _get_value(
            station,
            "stations_ahead",
        )

        name = _get_value(
            station,
            "name",
        )

        if index == last_index:
            status = "DESTINATION"

        elif stations_ahead == 1:
            status = "NEXT"

        else:
            status = "UPCOMING"

        route_stations.append(
            RouteStation(
                code=coordinates.code,
                name=(
                    name
                    or coordinates.name
                ),
                latitude=coordinates.latitude,
                longitude=coordinates.longitude,
                status=status,
                stations_ahead=stations_ahead,
            )
        )

    current_position = None

    provider_current = (
        provider_route_data.get(
            "current_position"
        )
    )

    if isinstance(
        provider_current,
        dict,
    ):
        latitude = provider_current.get(
            "latitude"
        )

        longitude = provider_current.get(
            "longitude"
        )

        if (
            latitude is not None
            and longitude is not None
        ):
            current_position = (
                TrainPosition(
                    latitude=float(
                        latitude
                    ),
                    longitude=float(
                        longitude
                    ),
                    position_source=(
                        "REAL_PROVIDER_GPS"
                    ),
                    accuracy_note=(
                        "Position supplied by "
                        "the live provider."
                    ),
                )
            )

    if (
        current_position is None
        and current_coordinates is not None
    ):
        current_position = (
        TrainPosition(
            latitude=(
                current_coordinates.latitude
            ),
            longitude=(
                current_coordinates.longitude
            ),
            position_source=(
                "CURRENT_STATION"
            ),
            accuracy_note=(
                "Position currently uses "
                "reported station coordinates."
            ),
        )
    )

    destination = None

    provider_destination = (
        provider_route_data.get(
            "destination"
        )
    )

    last_prediction = None

    if valid_prediction_stations:
        last_prediction = (
            valid_prediction_stations[-1][0]
        )

    last_prediction_station = (
        _get_value(
            last_prediction,
            "station",
        )
        if last_prediction is not None
        else None
    )

    destination_code = (
        provider_destination.get("code")
        if isinstance(
            provider_destination,
            dict,
        )
        else None
    )

    destination_name = (
        provider_destination.get("name")
        if isinstance(
            provider_destination,
            dict,
        )
        else None
    )

    if not destination_code:
        destination_code = (
            _get_value(
                last_prediction_station,
                "code",
            )
        )

    if not destination_name:
        destination_name = (
            _get_value(
                last_prediction_station,
                "name",
            )
        )

    if isinstance(
        provider_destination,
        dict,
    ):
        latitude = (
            provider_destination.get(
                "latitude"
            )
        )

        longitude = (
            provider_destination.get(
                "longitude"
            )
        )

        if (
            latitude is not None
            and longitude is not None
        ):
            destination = (
                StationCoordinates(
                    code=str(
                        destination_code
                        or "DESTINATION"
                    ),
                    name=destination_name,
                    latitude=float(
                        latitude
                    ),
                    longitude=float(
                        longitude
                    ),
                    source=(
                        "RAILRADAR_DESTINATION"
                    ),
                )
            )

    if (
        destination is None
        and valid_prediction_stations
    ):
        destination = (
            valid_prediction_stations[-1][1]
        )
    source = None

    provider_source = (
        provider_route_data.get(
            "source"
        )
    )

    if isinstance(
        provider_source,
        dict,
    ):
        latitude = provider_source.get(
            "latitude"
        )

        longitude = provider_source.get(
            "longitude"
        )

        if (
            latitude is not None
            and longitude is not None
        ):
            source = StationCoordinates(
                code=(
                    str(
                        provider_source.get("code")
                        or "SOURCE"
                    )
                ),
                name=(
                    provider_source.get("name")
                ),
                latitude=float(latitude),
                longitude=float(longitude),
                source="RAILRADAR_SOURCE",
            )


    return RouteMap(
        source=source,
        destination=destination,
        current_position=current_position,
        stations=route_stations,
    )


