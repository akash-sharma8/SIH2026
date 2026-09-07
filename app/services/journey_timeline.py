from typing import Any

import pandas as pd

from app.utils.datetime import (
    timestamp_to_indian_iso,
)
def _safe_number(
    value: Any,
    digits: int = 1,
):
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass

    try:
        return round(
            float(value),
            digits,
        )
    except (TypeError, ValueError):
        return None


def _safe_text(
    value: Any,
):
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass

    text = str(value).strip()

    return text or None


def _normalized_status(
    value: Any,
) -> str:
    return (
        str(value or "")
        .strip()
        .lower()
        .replace("_", "-")
    )


def _prediction_by_station(
    predictions: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    result: dict[
        str,
        dict[str, Any],
    ] = {}

    for prediction in predictions:
        if not isinstance(
            prediction,
            dict,
        ):
            continue

        station = prediction.get(
            "station",
            {},
        )

        if not isinstance(
            station,
            dict,
        ):
            continue

        code = _safe_text(
            station.get(
                "code"
            )
        )

        if not code:
            continue

        result[
            code.upper()
        ] = prediction

    return result


def build_journey_timeline(
    *,
    normalized_journey_df: pd.DataFrame,
    predictions: list[dict[str, Any]],
) -> dict[str, Any]:

    route_df = (
        normalized_journey_df
        .copy()
        .reset_index(drop=True)
    )

    if route_df.empty:
        return {
            "state": "UNKNOWN",
            "stations": [],
        }

    sort_column = (
        "halt_order"
        if "halt_order"
        in route_df.columns
        else "station_sequence"
    )

    route_df = (
        route_df
        .sort_values(
            sort_column
        )
        .reset_index(
            drop=True
        )
    )

    journey_status = (
        _normalized_status(
            route_df[
                "journey_status"
            ].iloc[0]
        )
        if "journey_status"
        in route_df.columns
        else ""
    )

    prediction_map = (
        _prediction_by_station(
            predictions
        )
    )

    stations = []

    for _, row in (
        route_df.iterrows()
    ):
        code = _safe_text(
            row.get(
                "station_code"
            )
        )

        normalized_code = (
            code.upper()
            if code
            else ""
        )

        prediction = (
            prediction_map.get(
                normalized_code
            )
        )

        prediction_forecast = (
            prediction.get(
                "forecast",
                {},
            )
            if isinstance(
                prediction,
                dict,
            )
            else {}
        )

        station_status = (
            _normalized_status(
                row.get(
                    "station_status_normalized"
                )
            )
        )

        arrival_observed = bool(
            row.get(
                "arrival_is_observed",
                False,
            )
        )

        departure_observed = bool(
            row.get(
                "departure_is_observed",
                False,
            )
        )

        if journey_status in {
            "not-started",
            "not started",
            "scheduled",
        }:
            status = "SCHEDULED"

        elif prediction is not None:
            stations_ahead = (
                prediction
                .get(
                    "station",
                    {},
                )
                .get(
                    "stations_ahead"
                )
            )

            if stations_ahead == 1:
                status = "NEXT"

            else:
                status = "UPCOMING"

        elif (
            arrival_observed
            or departure_observed
            or station_status
            in {
                "departed",
                "passed",
                "current",
                "at-station",
                "at station",
            }
        ):
            status = "PASSED"

        elif journey_status in {
            "completed",
            "complete",
        }:
            status = "PASSED"

        else:
            status = "UPCOMING"

        actual_arrival = (
            timestamp_to_indian_iso(
                row.get(
                    "actual_arrival"
                )
            )
        )

        actual_departure = (
            timestamp_to_indian_iso(
                row.get(
                    "actual_departure"
                )
            )
        )

        predicted_arrival = (
            prediction_forecast.get(
                "eta"
            )
            if isinstance(
                prediction_forecast,
                dict,
            )
            else None
        )

        delay_min = (
            prediction_forecast.get(
                "predicted_delay_min"
            )
            if (
                isinstance(
                    prediction_forecast,
                    dict,
                )
                and prediction
                is not None
            )
            else row.get(
                "arrival_delay_min"
            )
        )

        stations.append(
            {
                "station_code":
                    code,

                "station_name":
                    _safe_text(
                        row.get(
                            "station_name"
                        )
                    ),

                "status":
                    status,

                "scheduled_arrival":
                    timestamp_to_indian_iso(
                        row.get(
                            "scheduled_arrival"
                        )
                    ),

                "scheduled_departure":
                    timestamp_to_indian_iso(
                        row.get(
                            "scheduled_departure"
                        )
                    ),

                "actual_arrival":
                    actual_arrival,

                "actual_departure":
                    actual_departure,

                "predicted_arrival":
                    predicted_arrival,

                "predicted_departure":
                    None,

                "delay_min":
                    _safe_number(
                        delay_min
                    ),

                "platform":
                    _safe_text(
                        row.get(
                            "platform"
                        )
                    ),

                "distance_from_source_km":
                    _safe_number(
                        row.get(
                            "distance_from_source_km"
                        )
                    ),
            }
        )

    if journey_status in {
        "not-started",
        "not started",
        "scheduled",
    }:
        state = (
            "SCHEDULED_NOT_STARTED"
        )

    elif journey_status in {
        "completed",
        "complete",
    }:
        state = "COMPLETED"

    else:
        state = "RUNNING"

    return {
        "state": state,
        "stations": stations,
    }