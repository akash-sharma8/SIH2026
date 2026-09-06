from datetime import datetime


def parse_iso_datetime(
    value: str,
) -> datetime:
    return datetime.fromisoformat(
        value
    )


def minutes_between(
    first: datetime,
    second: datetime,
) -> float:
    difference = abs(
        (
            first
            - second
        ).total_seconds()
    )

    return (
        difference
        / 60.0
    )


def find_nearest_forecast(
    *,
    predicted_eta: str,
    forecasts: list[dict],
) -> dict | None:
    if not forecasts:
        return None

    eta = parse_iso_datetime(
        predicted_eta
    )

    best_forecast = None
    best_difference = None

    for forecast in forecasts:
        forecast_time = (
            forecast.get(
                "forecast_time"
            )
        )

        if not forecast_time:
            continue

        try:
            timestamp = (
                parse_iso_datetime(
                    str(
                        forecast_time
                    )
                )
            )

        except ValueError:
            continue

        difference = (
            minutes_between(
                eta,
                timestamp,
            )
        )

        if (
            best_difference is None
            or difference
            < best_difference
        ):
            best_difference = (
                difference
            )

            best_forecast = (
                forecast
            )

    return best_forecast