from app.services.weather_risk import (
    classify_weather_risk,
)


def test_low_weather_risk():
    result = classify_weather_risk(
        precipitation_probability_pct=20,
        visibility_km=10,
        wind_kph=8,
    )

    assert result == "LOW"


def test_moderate_weather_risk():
    result = classify_weather_risk(
        precipitation_probability_pct=75,
        visibility_km=8,
        wind_kph=10,
    )

    assert result == "MODERATE"


def test_high_weather_risk():
    result = classify_weather_risk(
        precipitation_probability_pct=95,
        visibility_km=8,
        wind_kph=10,
    )

    assert result == "HIGH"


def test_severe_weather_risk():
    result = classify_weather_risk(
        precipitation_probability_pct=30,
        visibility_km=0.5,
        wind_kph=10,
    )

    assert result == "SEVERE"


def test_unknown_weather_risk():
    result = classify_weather_risk(
        precipitation_probability_pct=None,
        visibility_km=None,
        wind_kph=None,
    )

    assert result == "UNKNOWN"