from app.services.weather_time import (
    find_nearest_forecast,
    minutes_between,
    parse_iso_datetime,
)


def test_parse_iso_datetime():
    result = parse_iso_datetime(
        "2026-09-03T16:30:00+05:30"
    )

    assert result.hour == 16
    assert result.minute == 30


def test_minutes_between():
    first = parse_iso_datetime(
        "2026-09-03T16:30:00+05:30"
    )

    second = parse_iso_datetime(
        "2026-09-03T17:00:00+05:30"
    )

    assert (
        minutes_between(
            first,
            second,
        )
        == 30
    )


def test_find_nearest_forecast():
    forecasts = [
        {
            "forecast_time":
                "2026-09-03T15:00:00+05:30",
        },
        {
            "forecast_time":
                "2026-09-03T18:00:00+05:30",
        },
        {
            "forecast_time":
                "2026-09-03T21:00:00+05:30",
        },
    ]

    result = find_nearest_forecast(
        predicted_eta=(
            "2026-09-03T17:20:00+05:30"
        ),
        forecasts=forecasts,
    )

    assert result is not None

    assert (
        result["forecast_time"]
        == "2026-09-03T18:00:00+05:30"
    )


def test_empty_forecasts_returns_none():
    result = find_nearest_forecast(
        predicted_eta=(
            "2026-09-03T17:20:00+05:30"
        ),
        forecasts=[],
    )

    assert result is None