from typing import Any

import numpy as np
import pandas as pd

from app.inference.normalizer import safe_datetime


def horizon_label(stations_ahead: int) -> str:
    stations_ahead = int(stations_ahead)

    if stations_ahead == 1:
        return "1 station"

    if stations_ahead <= 3:
        return "2–3 stations"

    if stations_ahead <= 7:
        return "4–7 stations"

    return "8+ stations"


def horizon_interval_radius(
    stations_ahead: int,
    horizon_radii: dict[str, float],
    global_radius: float,
) -> float:
    label = horizon_label(stations_ahead)

    return float(
        horizon_radii.get(
            label,
            global_radius,
        )
    )


def build_live_inference_rows(
    normalized_journey_df: pd.DataFrame,
):
    journey_df = (
        normalized_journey_df
        .copy()
        .sort_values(
            [
                "halt_order",
                "station_sequence",
            ]
        )
        .reset_index(drop=True)
    )

    observed_df = journey_df[
        journey_df["arrival_is_observed"]
        & journey_df["actual_arrival"].notna()
        & journey_df["arrival_delay_min"].notna()
    ].copy()

    if observed_df.empty:
        raise ValueError(
            "No verified station arrival is available. "
            "Model 3 requires at least one observed station."
        )

    current = (
        observed_df
        .sort_values(
            [
                "halt_order",
                "station_sequence",
            ]
        )
        .iloc[-1]
    )

    upcoming_df = journey_df[
        (
            journey_df["halt_order"]
            > current["halt_order"]
        )
        & (
            ~journey_df["arrival_is_observed"]
        )
    ].copy()

    if upcoming_df.empty:
        return (
            pd.DataFrame(),
            current,
        )

    observed_delays = (
        observed_df["arrival_delay_min"]
        .dropna()
        .astype(float)
        .tolist()
    )

    current_delay = float(
        current["arrival_delay_min"]
    )

    previous_delay_1 = (
        observed_delays[-2]
        if len(observed_delays) >= 2
        else np.nan
    )

    previous_delay_2 = (
        observed_delays[-3]
        if len(observed_delays) >= 3
        else np.nan
    )

    previous_delay_3 = (
        observed_delays[-4]
        if len(observed_delays) >= 4
        else np.nan
    )

    rolling_delays = observed_delays[-3:]

    rolling_mean = float(
        np.mean(rolling_delays)
    )

    rolling_std = (
        float(
            np.std(
                rolling_delays,
                ddof=1,
            )
        )
        if len(rolling_delays) >= 2
        else np.nan
    )

    current_delay_change = (
        current_delay - previous_delay_1
        if pd.notna(previous_delay_1)
        else np.nan
    )

    inference_rows = []

    for _, target in upcoming_df.iterrows():
        stations_ahead = int(
            target["halt_order"]
            - current["halt_order"]
        )

        distance_to_target = (
            target["distance_from_source_km"]
            - current["distance_from_source_km"]
        )

        scheduled_minutes_to_target = (
            target["scheduled_arrival"]
            - current["scheduled_arrival"]
        ).total_seconds() / 60

        inference_rows.append({
            "journey_id":
                current["journey_id"],
            "train_number":
                current["train_number"],
            "train_name":
                current["train_name"],

            "current_station_code":
                current["station_code"],
            "target_station_code":
                target["station_code"],
            "target_station_name":
                target["station_name"],

            "current_halt_order":
                current["halt_order"],
            "current_station_sequence":
                current["station_sequence"],
            "current_distance_from_source_km":
                current[
                    "distance_from_source_km"
                ],
            "current_route_progress":
                current["route_progress"],

            "target_halt_order":
                target["halt_order"],
            "target_station_sequence":
                target["station_sequence"],
            "target_distance_from_source_km":
                target[
                    "distance_from_source_km"
                ],

            "current_arrival_delay_min":
                current_delay,
            "current_departure_delay_min":
                current[
                    "departure_delay_min"
                ],

            "previous_arrival_delay_1":
                previous_delay_1,
            "previous_arrival_delay_2":
                previous_delay_2,
            "previous_arrival_delay_3":
                previous_delay_3,

            "current_delay_change":
                current_delay_change,
            "delay_rolling_mean_3":
                rolling_mean,
            "delay_rolling_std_3":
                rolling_std,
            "observed_stations_so_far":
                len(observed_delays),

            "stations_ahead":
                stations_ahead,
            "distance_to_target_km":
                distance_to_target,
            "scheduled_minutes_to_target":
                scheduled_minutes_to_target,

            "journey_day_of_week":
                current[
                    "scheduled_arrival"
                ].dayofweek,
            "journey_month":
                current[
                    "scheduled_arrival"
                ].month,
            "current_hour":
                current[
                    "scheduled_arrival"
                ].hour,
            "target_hour":
                target[
                    "scheduled_arrival"
                ].hour,

            "target_scheduled_arrival":
                target["scheduled_arrival"],

            "provider_estimated_arrival":
                target[
                    "provider_estimated_arrival"
                ],
        })

    inference_df = pd.DataFrame(
        inference_rows
    )

    return inference_df, current


def predict_upcoming_station_etas(
    normalized_journey_df: pd.DataFrame,
    *,
    model: Any,
    model3_config: dict,
):
    inference_df, current = (
        build_live_inference_rows(
            normalized_journey_df
        )
    )

    summary = {
        "journey_id":
            current["journey_id"],
        "train_number":
            current["train_number"],
        "train_name":
            current["train_name"],
        "current_station_code":
            current["station_code"],
        "current_station_name":
            current["station_name"],
        "current_observed_arrival":
            current["actual_arrival"],
        "current_delay_min":
            float(
                current[
                    "arrival_delay_min"
                ]
            ),
        "upcoming_stations":
            len(inference_df),
    }

    if inference_df.empty:
        return inference_df, summary

    inference_df[
        "target_scheduled_arrival"
    ] = safe_datetime(
        inference_df[
            "target_scheduled_arrival"
        ]
    )

    inference_df[
        "provider_estimated_arrival"
    ] = safe_datetime(
        inference_df[
            "provider_estimated_arrival"
        ]
    )

    feature_order = model3_config["features"]

    model_features = inference_df[
        feature_order
    ].copy()

    for column in feature_order:
        model_features[column] = pd.to_numeric(
            model_features[column],
            errors="coerce",
        )

    raw_residual = model.predict(
        model_features
    )

    raw_residual = np.clip(
        raw_residual,
        model3_config["residual_clip_min"],
        model3_config["residual_clip_max"],
    )

    inference_df[
        "recent_delay_baseline_min"
    ] = inference_df[
        "delay_rolling_mean_3"
    ]

    inference_df[
        "predicted_residual_correction_min"
    ] = (
        float(model3_config["residual_alpha"])
        * raw_residual
    )

    inference_df[
        "predicted_arrival_delay_min"
    ] = (
        inference_df[
            "recent_delay_baseline_min"
        ]
        + inference_df[
            "predicted_residual_correction_min"
        ]
    )

    horizon_radii = model3_config[
        "horizon_interval_radius_min"
    ]

    global_radius = float(
        model3_config[
            "global_interval_radius_min"
        ]
    )

    inference_df[
        "prediction_interval_radius_min"
    ] = inference_df[
        "stations_ahead"
    ].map(
        lambda value: horizon_interval_radius(
            value,
            horizon_radii,
            global_radius,
        )
    )

    inference_df["predicted_eta"] = (
        inference_df[
            "target_scheduled_arrival"
        ]
        + pd.to_timedelta(
            inference_df[
                "predicted_arrival_delay_min"
            ],
            unit="m",
        )
    )

    inference_df["eta_lower"] = (
        inference_df["predicted_eta"]
        - pd.to_timedelta(
            inference_df[
                "prediction_interval_radius_min"
            ],
            unit="m",
        )
    )

    inference_df["eta_upper"] = (
        inference_df["predicted_eta"]
        + pd.to_timedelta(
            inference_df[
                "prediction_interval_radius_min"
            ],
            unit="m",
        )
    )

    inference_df[
        "provider_predicted_delay_min"
    ] = (
        inference_df[
            "provider_estimated_arrival"
        ]
        - inference_df[
            "target_scheduled_arrival"
        ]
    ).dt.total_seconds() / 60

    output_columns = [
        "journey_id",
        "train_number",
        "train_name",
        "current_station_code",
        "target_station_code",
        "target_station_name",
        "stations_ahead",
        "distance_to_target_km",
        "target_scheduled_arrival",
        "recent_delay_baseline_min",
        "predicted_residual_correction_min",
        "predicted_arrival_delay_min",
        "predicted_eta",
        "eta_lower",
        "eta_upper",
        "prediction_interval_radius_min",
        "provider_estimated_arrival",
        "provider_predicted_delay_min",
    ]

    return (
        inference_df[output_columns],
        summary,
    )



def extract_model3_prediction_result(model3_result):
    """
    Extract Model 3 predictions DataFrame and journey summary
    without depending on the legacy ML runtime.
    """

    model3_predictions_df = None
    model3_journey_summary = {}

    if isinstance(model3_result, pd.DataFrame):
        model3_predictions_df = model3_result

    elif isinstance(model3_result, tuple):
        for returned_item in model3_result:
            if isinstance(returned_item, pd.DataFrame):
                model3_predictions_df = returned_item

            elif isinstance(returned_item, dict):
                model3_journey_summary = returned_item

        if model3_predictions_df is None:
            tuple_item_types = [
                type(returned_item).__name__
                for returned_item in model3_result
            ]

            raise TypeError(
                "Model 3 returned a tuple without a DataFrame. "
                f"Tuple item types: {tuple_item_types}"
            )

    elif isinstance(model3_result, dict):
        dataframe_keys = [
            "predictions",
            "predictions_df",
            "station_predictions",
            "station_predictions_df",
            "data",
        ]

        for dataframe_key in dataframe_keys:
            candidate_value = model3_result.get(
                dataframe_key
            )

            if isinstance(candidate_value, pd.DataFrame):
                model3_predictions_df = candidate_value
                break

        possible_summary = model3_result.get(
            "journey_summary",
            model3_result.get("journey", {}),
        )

        if isinstance(possible_summary, dict):
            model3_journey_summary = possible_summary

    else:
        raise TypeError(
            "Unexpected Model 3 return type: "
            f"{type(model3_result).__name__}"
        )

    if not isinstance(
        model3_predictions_df,
        pd.DataFrame,
    ):
        raise TypeError(
            "Could not extract a prediction DataFrame "
            "from the Model 3 result."
        )

    return (
        model3_predictions_df,
        model3_journey_summary,
    )