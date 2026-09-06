def classify_weather_risk(
    *,
    precipitation_probability_pct: float | None,
    visibility_km: float | None,
    wind_kph: float | None,
) -> str:

    severe = False
    high = False
    moderate = False

    if visibility_km is not None:
        if visibility_km < 1:
            severe = True
        elif visibility_km < 3:
            high = True
        elif visibility_km < 5:
            moderate = True

    if precipitation_probability_pct is not None:
        if precipitation_probability_pct >= 90:
            high = True
        elif precipitation_probability_pct >= 70:
            moderate = True

    if wind_kph is not None:
        if wind_kph >= 60:
            severe = True
        elif wind_kph >= 40:
            high = True
        elif wind_kph >= 25:
            moderate = True

    if severe:
        return "SEVERE"

    if high:
        return "HIGH"

    if moderate:
        return "MODERATE"

    if (
        precipitation_probability_pct is None
        and visibility_km is None
        and wind_kph is None
    ):
        return "UNKNOWN"

    return "LOW"