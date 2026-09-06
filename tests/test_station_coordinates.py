from app.services.station_coordinates import (
    get_many_station_coordinates,
    get_station_coordinates,
)


def test_get_station_coordinates():
    station = get_station_coordinates("GWL")

    assert station is not None
    assert station.code == "GWL"
    assert station.latitude != 0
    assert station.longitude != 0


def test_station_code_is_case_insensitive():
    station = get_station_coordinates("ndls")

    assert station is not None
    assert station.code == "NDLS"


def test_unknown_station_returns_none():
    station = get_station_coordinates("XXXXX")

    assert station is None


def test_get_many_station_coordinates():
    stations = get_many_station_coordinates(
        [
            "BINA",
            "VGLJ",
            "GWL",
            "NDLS",
        ]
    )

    assert len(stations) == 4