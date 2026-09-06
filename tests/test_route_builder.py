from app.services.route_builder import (
    build_route_coordinates,
)


def test_build_route_coordinates():
    route = build_route_coordinates(
        [
            "BINA",
            "VGLJ",
            "GWL",
            "NDLS",
        ]
    )

    assert len(route) == 4

    assert route[0].code == "BINA"
    assert route[-1].code == "NDLS"


def test_unknown_station_is_skipped():
    route = build_route_coordinates(
        [
            "BINA",
            "XXXXX",
            "NDLS",
        ]
    )

    assert len(route) == 2

    assert [
        station.code
        for station in route
    ] == [
        "BINA",
        "NDLS",
    ]