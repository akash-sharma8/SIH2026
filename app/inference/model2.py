from typing import Any

import numpy as np
import pandas as pd


def build_model2_live_features(
    normalized_journey_df: pd.DataFrame,
    feature_order: list[str],
    categorical_features: list[str],
):
    journey_df = (
        normalized_journey_df
        .copy()
        .sort_values("halt_order")
        .reset_index(drop=True)
    )

    observed_df = journey_df[
        journey_df["arrival_is_observed"]
        & journey_df["actual_arrival"].notna()
        & journey_df["arrival_delay_min"].notna()
    ].copy()

    if observed_df.empty:
        raise ValueError(
            "Model 2 needs at least one observed station."
        )

    current = observed_df.iloc[-1]

    future_df = journey_df[
        (
            journey_df["halt_order"]
            > current["halt_order"]
        )
        & (
            ~journey_df["arrival_is_observed"]
        )
    ].copy()

    if future_df.empty:
        raise ValueError(
            "No upcoming station remains."
        )

    next_station = future_df.iloc[0]

    observed_delays = (
        observed_df["arrival_delay_min"]
        .astype(float)
        .tolist()
    )

    current_delay = float(observed_delays[-1])

    prev_delay_1 = (
        observed_delays[-2]
        if len(observed_delays) >= 2
        else np.nan
    )

    prev_delay_2 = (
        observed_delays[-3]
        if len(observed_delays) >= 3
        else np.nan
    )

    delay_change_prev = (
        current_delay - prev_delay_1
        if pd.notna(prev_delay_1)
        else np.nan
    )

    delay_trend_2 = (
        current_delay - prev_delay_2
        if pd.notna(prev_delay_2)
        else np.nan
    )

    segment_distance = (
        next_station["distance_from_source_km"]
        - current["distance_from_source_km"]
    )

    current_scheduled_departure = (
        current["scheduled_departure"]
    )

    if pd.isna(current_scheduled_departure):
        current_scheduled_departure = (
            current["scheduled_arrival"]
        )

    scheduled_segment_minutes = (
        next_station["scheduled_arrival"]
        - current_scheduled_departure
    ).total_seconds() / 60

    if scheduled_segment_minutes <= 0:
        raise ValueError(
            "Invalid scheduled segment duration."
        )

    scheduled_segment_speed = (
        segment_distance
        / (scheduled_segment_minutes / 60)
    )

    total_halts = float(
        journey_df["halt_order"].max()
    )

    route_progress_safe = (
        float(current["halt_order"])
        / total_halts
    )

    scheduled_departure = pd.to_datetime(
        current_scheduled_departure,
        utc=True,
    )

    feature_row = {
        "current_delay": current_delay,
        "prev_delay_1": prev_delay_1,
        "prev_delay_2": prev_delay_2,
        "delay_change_prev": delay_change_prev,
        "delay_trend_2": delay_trend_2,
        "segment_distance": segment_distance,
        "scheduled_segment_minutes":
            scheduled_segment_minutes,
        "scheduled_segment_speed":
            scheduled_segment_speed,
        "station_sequence":
            int(current["halt_order"]),
        "route_progress_safe":
            route_progress_safe,
        "departure_hour":
            int(scheduled_departure.hour),
        "day_of_week":
            int(scheduled_departure.dayofweek),
        "is_weekend":
            int(scheduled_departure.dayofweek >= 5),
        "train":
            str(current["train_number"]),
        "station":
            str(current["station_code"]),
        "next_station":
            str(next_station["station_code"]),
    }

    features_df = pd.DataFrame([feature_row])

    for column in categorical_features:
        features_df[column] = (
            features_df[column].astype(str)
        )

    features_df = features_df[feature_order]

    return (
        features_df,
        current,
        next_station,
    )


def predict_model2_next_station(
    normalized_journey_df: pd.DataFrame,
    model: Any,
    feature_order: list[str],
    categorical_features: list[str],
) -> dict[str, Any]:

    features_df, current, next_station = (
        build_model2_live_features(
            normalized_journey_df,
            feature_order,
            categorical_features,
        )
    )

    raw_prediction = float(
        model.predict(features_df)[0]
    )

    model2_prediction = max(
        0.0,
        raw_prediction,
    )

    current_delay = float(
        current["arrival_delay_min"]
    )

    model2_applicable = (
        current_delay >= 0
    )

    result = {
        "train_number":
            str(current["train_number"]),
        "current_station_code":
            str(current["station_code"]),
        "next_station_code":
            str(next_station["station_code"]),
        "current_delay_min":
            current_delay,
        "model2_raw_prediction_min":
            raw_prediction,
        "model2_prediction_min":
            model2_prediction,
        "model2_applicable":
            model2_applicable,
        "not_applicable_reason":
            (
                None
                if model2_applicable
                else
                "Model 2 training labels did not "
                "contain early/negative delays."
            ),
        "features":
            features_df,
    }

    prediction_value = result.get(
        "model2_prediction_min"
    )

    try:
        prediction_value = float(
            prediction_value
        )

        prediction_is_valid = np.isfinite(
            prediction_value
        )

    except (TypeError, ValueError):
        prediction_is_valid = False

    original_applicable = bool(
        result.get(
            "model2_applicable",
            False,
        )
    )

    original_reason = str(
        result.get(
            "not_applicable_reason",
            "",
        )
        or ""
    )

    early_running_rejection = (
        not original_applicable
        and prediction_is_valid
        and "early" in original_reason.lower()
    )

    if early_running_rejection:
        result["model2_applicable"] = True

        result["applicability_warning"] = (
            "Model 2 was trained primarily with "
            "non-negative delays. The current train is "
            "early, so this prediction must be interpreted "
            "with its uncertainty interval."
        )

        result["policy_override"] = (
            "EARLY_RUNNING_WARNING"
        )

        result[
            "original_not_applicable_reason"
        ] = original_reason

        result["not_applicable_reason"] = None

    else:
        result["applicability_warning"] = None
        result["policy_override"] = None

    return result