from app.schemas.station import StationCoordinates


_STATIONS: dict[str, StationCoordinates] = {
    "BINA": StationCoordinates(
        code="BINA",
        name="Bina Jn",
        latitude=24.1719,
        longitude=78.2039,
        source="STATIC_REFERENCE",
    ),

    "VGLJ": StationCoordinates(
        code="VGLJ",
        name="Veerangana Lakshmibai Jhansi",
        latitude=25.4337,
        longitude=78.5685,
        source="STATIC_REFERENCE",
    ),

    "GWL": StationCoordinates(
        code="GWL",
        name="Gwalior Jn",
        latitude=26.2183,
        longitude=78.1828,
        source="STATIC_REFERENCE",
    ),

    "MRA": StationCoordinates(
        code="MRA",
        name="Morena",
        latitude=26.4983,
        longitude=77.9953,
        source="STATIC_REFERENCE",
    ),

    "DHO": StationCoordinates(
        code="DHO",
        name="Dhaulpur",
        latitude=26.7025,
        longitude=77.8934,
        source="STATIC_REFERENCE",
    ),

    "AGC": StationCoordinates(
        code="AGC",
        name="Agra Cantt",
        latitude=27.1577,
        longitude=77.9897,
        source="STATIC_REFERENCE",
    ),

    "BFP": StationCoordinates(
        code="BFP",
        name="Bilochpura",
        latitude=27.1857,
        longitude=77.9748,
        source="STATIC_REFERENCE",
    ),

    "MTJ": StationCoordinates(
        code="MTJ",
        name="Mathura Jn",
        latitude=27.4924,
        longitude=77.6737,
        source="STATIC_REFERENCE",
    ),

    "FDB": StationCoordinates(
        code="FDB",
        name="Faridabad",
        latitude=28.3956,
        longitude=77.3139,
        source="STATIC_REFERENCE",
    ),

    "NZM": StationCoordinates(
        code="NZM",
        name="Hazrat Nizamuddin Jn",
        latitude=28.5888,
        longitude=77.2507,
        source="STATIC_REFERENCE",
    ),

    "NDLS": StationCoordinates(
        code="NDLS",
        name="New Delhi",
        latitude=28.6421,
        longitude=77.2196,
        source="STATIC_REFERENCE",
    ),
}


def get_station_coordinates(
    station_code: str,
) -> StationCoordinates | None:
    return _STATIONS.get(
        station_code.strip().upper(),
    )


def get_many_station_coordinates(
    station_codes: list[str],
) -> list[StationCoordinates]:
    results: list[StationCoordinates] = []

    for code in station_codes:
        station = get_station_coordinates(code)

        if station is not None:
            results.append(station)

    return results