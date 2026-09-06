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
    