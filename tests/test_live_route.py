from types import SimpleNamespace

from app.services.live_route import (
    build_live_route_from_predictions,
)


def test_build_live_route_from_predictions():
    predictions = [
        SimpleNamespace(
            station=SimpleNamespace(
                code="BINA",
            )
        ),
        SimpleNamespace(
            station=SimpleNamespace(
                code="VGLJ",
            )
        ),
        SimpleNamespace(
            station=SimpleNamespace(
                code="GWL",
            )
        ),
        SimpleNamespace(
            station=SimpleNamespace(
                code="NDLS",
            )
        ),
    ]

    route = (
        build_live_route_from_predictions(
            predictions,
        )
    )

    assert [
        station.code
        for station in route
    ] == [
        "BINA",
        "VGLJ",
        "GWL",
        "NDLS",
    ]


def test_missing_station_is_ignored():
    predictions = [
        SimpleNamespace(
            station=None,
        ),
        SimpleNamespace(
            station=SimpleNamespace(
                code="BINA",
            )
        ),
    ]

    route = (
        build_live_route_from_predictions(
            predictions,
        )
    )

    assert len(route) == 1
    assert route[0].code == "BINA"


def test_unknown_coordinate_station_is_skipped():
    predictions = [
        SimpleNamespace(
            station=SimpleNamespace(
                code="XXXXX",
            )
        ),
        SimpleNamespace(
            station=SimpleNamespace(
                code="NDLS",
            )
        ),
    ]

    route = (
        build_live_route_from_predictions(
            predictions,
        )
    )

    assert len(route) == 1
    assert route[0].code == "NDLS"