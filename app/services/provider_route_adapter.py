from typing import Any


def _as_float(
    value: Any,
) -> float | None:
    try:
        if value is None:
            return None

        return float(value)

    except (
        TypeError,
        ValueError,
    ):
        return None


def _is_plausible_india_coordinate(
    latitude: float | None,
    longitude: float | None,
) -> bool:
    if (
        latitude is None
        or longitude is None
    ):
        return False

    return (
        6.0 <= latitude <= 38.0
        and 68.0 <= longitude <= 98.0
    )

def _coordinates_from_dict(
    value: Any,
) -> tuple[
    float | None,
    float | None,
]:
    if not isinstance(
        value,
        dict,
    ):
        return None, None

    latitude = _as_float(
        value.get(
            "lat",
            value.get("latitude"),
        )
    )

    longitude = _as_float(
        value.get(
            "lng",
            value.get(
                "lon",
                value.get("longitude"),
            ),
        )
    )

    if not _is_plausible_india_coordinate(
        latitude,
        longitude,
    ):
        return None, None

    return (
        latitude,
        longitude,
    )


def extract_provider_route_data(
    payload: dict[str, Any],
) -> dict[str, Any]:
    data = payload.get(
        "data",
        {},
    )

    if not isinstance(
        data,
        dict,
    ):
        return {
            "source": None,
            "destination": None,
            "current_position": None,
            "route": [],
        }

    train = data.get(
        "train",
        {},
    )

    source = (
        train.get("source")
        if isinstance(
            train,
            dict,
        )
        else None
    )

    destination = (
        train.get("destination")
        if isinstance(
            train,
            dict,
        )
        else None
    )

    current_location = data.get(
        "currentLocation",
        {},
    )

    current_coordinates = (
        current_location.get(
            "coordinates"
        )
        if isinstance(
            current_location,
            dict,
        )
        else None
    )

    source_lat, source_lng = (
        _coordinates_from_dict(
            source,
        )
    )

    source_code = (
        source.get("code")
        or source.get("stationCode")
        if isinstance(source, dict)
        else None
    )

    source_name = (
        source.get("name")
        or source.get("stationName")
        if isinstance(source, dict)
        else None
    )

    destination_code = (
        destination.get("code")
        or destination.get("stationCode")
        if isinstance(destination, dict)
        else None
    )

    destination_name = (
        destination.get("name")
        or destination.get("stationName")
        if isinstance(destination, dict)
        else None
    )

    destination_lat, destination_lng = (
        _coordinates_from_dict(
            destination,
        )
    )

    current_lat, current_lng = (
        _coordinates_from_dict(
            current_coordinates,
        )
    )

    normalized_route: list[
        dict[str, Any]
    ] = []

    raw_route = data.get(
        "route",
        [],
    )

    if isinstance(
        raw_route,
        list,
    ):
        for station in raw_route:
            if not isinstance(
                station,
                dict,
            ):
                continue

            latitude, longitude = (
                _coordinates_from_dict(
                    station,
                )
            )

            if (
                latitude is None
                or longitude is None
            ):
                continue

            normalized_route.append(
                {
                    "code": (
                        station.get("code")
                        or station.get(
                            "stationCode"
                        )
                    ),
                    "name": (
                        station.get("name")
                        or station.get(
                            "stationName"
                        )
                    ),
                    "latitude": latitude,
                    "longitude": longitude,
                    "status": station.get("status"),
                }
            )

    return {
        "source": (
            {
                "code": source_code,
                "name": source_name,
                "latitude": source_lat,
                "longitude": source_lng,
            }
            if (
                source_lat is not None
                and source_lng is not None
            )
            else None
        ),

        "destination": (
            {
                "code": destination_code,
                "name": destination_name,
                "latitude": destination_lat,
                "longitude": destination_lng,
            }
            if (
                destination_lat is not None
                and destination_lng is not None
            )
            else None
        ),

        "current_position": (
            {
                "latitude":
                    current_lat,
                "longitude":
                    current_lng,
            }
            if (
                current_lat is not None
                and current_lng is not None
            )
            else None
        ),

        "route":
            normalized_route,
    }