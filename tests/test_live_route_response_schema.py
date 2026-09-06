from app.schemas.route import (
    RouteMap,
    RouteStation,
    TrainPosition,
)


def test_route_map_can_be_serialized():
    route = RouteMap(
        source=None,
        destination=None,

        current_position=TrainPosition(
            latitude=26.2183,
            longitude=78.1828,
            position_source="CURRENT_STATION",
            accuracy_note=(
                "Using reported current station."
            ),
        ),

        stations=[
            RouteStation(
                code="GWL",
                name="Gwalior Jn",
                latitude=26.2183,
                longitude=78.1828,
                status="CURRENT",
                stations_ahead=0,
            ),
            RouteStation(
                code="MRA",
                name="Morena",
                latitude=26.4983,
                longitude=77.9953,
                status="NEXT",
                stations_ahead=1,
            ),
        ],
    )

    payload = route.model_dump()

    assert payload["current_position"] is not None
    assert (
        payload["current_position"]
        ["position_source"]
        == "CURRENT_STATION"
    )

    assert len(payload["stations"]) == 2