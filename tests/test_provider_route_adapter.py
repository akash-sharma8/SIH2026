from app.services.provider_route_adapter import (
    extract_provider_route_data,
)


def test_extract_provider_route_data():
    payload = {
        "data": {
            "train": {
                    "source": {
                        "code": "MAS",
                        "name": "Chennai Central",
                        "lat": 13.08,
                        "lng": 80.27,
                    },
                    "destination": {
                        "code": "NDLS",
                        "name": "New Delhi",
                        "lat": 28.64,
                        "lng": 77.21,
                    },
            },

            "currentLocation": {
                "coordinates": {
                    "lat": 20.74,
                    "lng": 78.60,
                }
            },


            "route": [
                {
                    "code": "SEGM",
                    "name": "Sevagram",
                    "lat": 20.73,
                    "lng": 78.60,
                },
                {
                    "code": "AJNI",
                    "name": "Ajni",
                    "lat": 21.12,
                    "lng": 79.08,
                },
            ],
        }
    }

    result = (
        extract_provider_route_data(
            payload
        )
    )

    assert (
        result["current_position"]
        ["latitude"]
        == 20.74
    )

    assert len(
        result["route"]
    ) == 2

    assert (
        result["route"][1]["code"]
        == "AJNI"
    )

    assert result["source"]["code"] == "MAS"
    assert result["source"]["name"] == "Chennai Central"

    assert result["destination"]["code"] == "NDLS"
    assert result["destination"]["name"] == "New Delhi"


def test_missing_data_is_safe():
    result = (
        extract_provider_route_data(
            {}
        )
    )

    assert result["source"] is None
    assert (
        result["destination"]
        is None
    )
    assert (
        result["current_position"]
        is None
    )
    assert result["route"] == []



def test_provider_route_preserves_station_status():
    payload = {
        "data": {
            "route": [
                {
                    "code": "NDLS",
                    "name": "New Delhi",
                    "lat": 28.642,
                    "lng": 77.220,
                    "status": "departed",
                },
                {
                    "code": "GWL",
                    "name": "Gwalior Jn",
                    "lat": 26.216,
                    "lng": 78.183,
                    "status": "at-station",
                },
                {
                    "code": "VGLJ",
                    "name": "Jhansi",
                    "lat": 25.444,
                    "lng": 78.553,
                    "status": "upcoming",
                },
            ],
        }
    }

    result = extract_provider_route_data(
        payload
    )

    assert len(result["route"]) == 3

    assert (
        result["route"][0]["status"]
        == "departed"
    )

    assert (
        result["route"][1]["status"]
        == "at-station"
    )

    assert (
        result["route"][2]["status"]
        == "upcoming"
    )


def test_provider_route_rejects_out_of_india_coordinates():
    payload = {
        "data": {
            "route": [
                {
                    "code": "BAD",
                    "name": "Corrupt Point",
                    "lat": 9.08,
                    "lng": 7.48,
                    "status": "upcoming",
                },
                {
                    "code": "GWL",
                    "name": "Gwalior Jn",
                    "lat": 26.216,
                    "lng": 78.183,
                    "status": "upcoming",
                },
            ],
        }
    }

    result = extract_provider_route_data(
        payload
    )

    assert len(result["route"]) == 1

    assert (
        result["route"][0]["code"]
        == "GWL"
    )


def test_provider_current_position_rejects_outlier_coordinates():
    payload = {
        "data": {
            "currentLocation": {
                "coordinates": {
                    "lat": 9.08,
                    "lng": 7.48,
                }
            },
            "route": [],
        }
    }

    result = extract_provider_route_data(
        payload
    )

    assert (
        result["current_position"]
        is None
    )
