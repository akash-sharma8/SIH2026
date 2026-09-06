from types import SimpleNamespace

from app.services.route_map_builder import (
    build_route_map,
)


def test_build_route_map():
    predictions = [
        SimpleNamespace(
            station=SimpleNamespace(
                code="BINA",
                name="Bina Jn",
                stations_ahead=1,
            )
        ),
        SimpleNamespace(
            station=SimpleNamespace(
                code="VGLJ",
                name="Veerangana Lakshmibai Jhansi",
                stations_ahead=2,
            )
        ),
        SimpleNamespace(
            station=SimpleNamespace(
                code="NDLS",
                name="New Delhi",
                stations_ahead=3,
            )
        ),
    ]

    route = build_route_map(
        current_station_code="GWL",
        predictions=predictions,
    )

    assert len(route.stations) == 4

    assert route.stations[0].status == "CURRENT"
    assert route.stations[1].status == "NEXT"
    assert route.stations[2].status == "UPCOMING"
    assert route.stations[3].status == "DESTINATION"

    assert route.current_position is not None

    assert (
        route.current_position.position_source
        == "CURRENT_STATION"
    )

    assert route.destination is not None
    assert route.destination.code == "NDLS"


def test_unknown_current_station_is_safe():
    predictions = [
        SimpleNamespace(
            station=SimpleNamespace(
                code="BINA",
                name="Bina Jn",
                stations_ahead=1,
            )
        )
    ]

    route = build_route_map(
        current_station_code="XXXXX",
        predictions=predictions,
    )

    assert route.current_position is None

    assert len(route.stations) == 1
    assert route.stations[0].status == "DESTINATION"



def test_build_route_map_from_dict_predictions():
    predictions = [
        {
            "station": {
                "code": "BINA",
                "name": "Bina Jn",
                "stations_ahead": 1,
            }
        },
        {
            "station": {
                "code": "VGLJ",
                "name": "Veerangana Lakshmibai Jhansi",
                "stations_ahead": 2,
            }
        },
        {
            "station": {
                "code": "NDLS",
                "name": "New Delhi",
                "stations_ahead": 3,
            }
        },
    ]

    route = build_route_map(
        current_station_code="GWL",
        predictions=predictions,
    )

    assert len(route.stations) == 4

    assert route.stations[0].status == "CURRENT"
    assert route.stations[1].status == "NEXT"
    assert route.stations[2].status == "UPCOMING"
    assert route.stations[3].status == "DESTINATION"

    assert route.destination is not None
    assert route.destination.code == "NDLS"


def test_provider_coordinates_are_primary():
    predictions = [
        {
            "station": {
                "code": "AJNI",
                "name": "Ajni",
                "stations_ahead": 1,
            }
        },
        {
            "station": {
                "code": "NDLS",
                "name": "New Delhi",
                "stations_ahead": 2,
            }
        },
    ]

    provider_route_data = {
        "current_position": {
            "latitude": 20.745,
            "longitude": 78.602,
        },
        "route": [
            {
                "code": "AJNI",
                "name": "Ajni",
                "latitude": 21.128,
                "longitude": 79.083,
            },
            {
                "code": "NDLS",
                "name": "New Delhi",
                "latitude": 28.6421,
                "longitude": 77.2196,
            },
        ],
    }

    route = build_route_map(
        current_station_code="SEGM",
        predictions=predictions,
        provider_route_data=provider_route_data,
    )

    assert route.current_position is not None

    assert (
        route.current_position.position_source
        == "REAL_PROVIDER_GPS"
    )

    assert route.current_position.latitude == 20.745
    assert route.current_position.longitude == 78.602

    assert len(route.stations) == 2

    assert route.stations[0].code == "AJNI"
    assert route.stations[0].status == "NEXT"

    assert route.stations[0].latitude == 21.128

    assert route.stations[1].code == "NDLS"
    assert route.stations[1].status == "DESTINATION"