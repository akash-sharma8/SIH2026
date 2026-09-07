import math
from typing import Any, Callable

import pandas as pd

from app.inference.model2 import predict_model2_next_station
from app.utils.datetime import (
    timestamp_to_indian_iso,
)

from app.services.journey_timeline import (
    build_journey_timeline,
)


INDIAN_TIMEZONE = "Asia/Kolkata"


def safe_json_number(value, digits=2):
    if value is None or pd.isna(value):
        return None

    numeric_value = float(value)

    if not math.isfinite(numeric_value):
        return None

    return round(numeric_value, digits)


def build_hybrid_eta_service_response_v1(
    normalized_journey_df: pd.DataFrame,
    *,
    hybrid_predictor: Callable[[pd.DataFrame], pd.DataFrame],
):
    route_df = (
        normalized_journey_df
        .copy()
        .reset_index(drop=True)
    )

    if route_df.empty:
        raise ValueError(
            "Normalized journey is empty."
        )

    if "station_status_normalized" in route_df.columns:
        station_status = (
            route_df["station_status_normalized"]
            .astype("string")
            .str.strip()
            .str.lower()
        )
    else:
        station_status = (
            route_df["station_status"]
            .astype("string")
            .str.strip()
            .str.lower()
        )

    upcoming_mask = station_status.eq(
        "upcoming"
    )

    observed_mask = (
        route_df["arrival_is_observed"]
        .fillna(False)
        .astype(bool)
    )



    upcoming_count = int(
        upcoming_mask.sum()
    )

    observed_count = int(
        observed_mask.sum()
    )

    journey_status = (
        str(
            normalized_journey_df[
                "journey_status"
            ].iloc[0]
            if (
                "journey_status"
                in normalized_journey_df.columns
                and not normalized_journey_df.empty
            )
            else ""
        )
        .strip()
        .lower()
        .replace("_", "-")
    )

    preflight_state = None

    if journey_status in {
        "completed",
        "complete",
    }:
        preflight_state = "COMPLETED"

    elif journey_status in {
        "not-started",
        "not started",
        "scheduled",
    }:
        preflight_state = (
            "SCHEDULED_NOT_STARTED"
        )

    if preflight_state in {
        "COMPLETED",
        "SCHEDULED_NOT_STARTED",
    }:
        predictions_df = pd.DataFrame()

    elif upcoming_count == 0:
        preflight_state = (
            "NO_UPCOMING_STATIONS"
        )

        predictions_df = pd.DataFrame()

    elif observed_count == 0:
        preflight_state = (
            "INSUFFICIENT_VERIFIED_OBSERVATIONS"
        )

        predictions_df = pd.DataFrame()

    else:
        predictions_df = hybrid_predictor(
            normalized_journey_df
        )

    if predictions_df.empty:

        observed_df = route_df.loc[
            observed_mask
        ].copy()

        if not observed_df.empty:
            sort_column = (
                "halt_order"
                if "halt_order"
                in observed_df.columns
                else "station_sequence"
            )

            current_row = (
                observed_df
                .sort_values(sort_column)
                .iloc[-1]
            )

        elif preflight_state == "SCHEDULED_NOT_STARTED":
            current_row = None

        else:
            current_row = route_df.iloc[-1]

        def first_non_null(
            column: str,
        ):
            if column not in route_df.columns:
                return None

            values = (
                route_df[column]
                .dropna()
            )

            if values.empty:
                return None

            return values.iloc[0]

        journey_id = first_non_null(
            "journey_id"
        )

        train_number = first_non_null(
            "train_number"
        )

        train_name = first_non_null(
            "train_name"
        )
        journey_start_date = first_non_null(
            "journey_start_date"
        )

        if journey_id is None:
            raise ValueError(
                "Journey ID is unavailable."
            )

        if train_number is None:
            raise ValueError(
                "Train number is unavailable."
            )

        current_station_code = (
            current_row.get("station_code")
            if current_row is not None
            else None
        )

        current_station_name = (
            current_row.get("station_name")
            if current_row is not None
            else None
        )

        current_arrival = (
            current_row.get("actual_arrival")
            if current_row is not None
            else None
        )

        current_delay = (
            current_row.get("arrival_delay_min")
            if current_row is not None
            else None
        )

        if (
            current_row is not None
            and (
                current_delay is None
                or pd.isna(current_delay)
            )
        ):
            current_delay = current_row.get(
                "calculated_arrival_delay_min"
            )

        schedule = []
        source_row = None
        destination_row = None

        if preflight_state == "SCHEDULED_NOT_STARTED":
            sort_column = (
                "halt_order"
                if "halt_order" in route_df.columns
                else "station_sequence"
            )

            scheduled_rows = (
                route_df
                .sort_values(sort_column)
                .reset_index(drop=True)
            )

            source_row = (
                scheduled_rows.iloc[0]
                if not scheduled_rows.empty
                else None
            )

            destination_row = (
                scheduled_rows.iloc[-1]
                if not scheduled_rows.empty
                else None
            )

            for _, row in scheduled_rows.iterrows():
                schedule.append(
                    {
                        "station_code": (
                            str(row.get("station_code"))
                            if pd.notna(row.get("station_code"))
                            else None
                        ),
                        "station_name": (
                            str(row.get("station_name"))
                            if pd.notna(row.get("station_name"))
                            else None
                        ),
                        "scheduled_arrival":
                            timestamp_to_indian_iso(
                                row.get("scheduled_arrival")
                            ),
                        "scheduled_departure":
                            timestamp_to_indian_iso(
                                row.get("scheduled_departure")
                            ),
                        "platform": (
                            str(row.get("platform"))
                            if pd.notna(row.get("platform"))
                            else None
                        ),
                        "distance_from_source_km":
                            safe_json_number(
                                row.get(
                                    "distance_from_source_km"
                                ),
                                digits=1,
                            ),
                    }
                )

        timeline = build_journey_timeline(
            normalized_journey_df=route_df,
            predictions=[],
        )

        return {
            "success": True,

            "system": {
                "name":
                    "SIH 26028 Hybrid Dynamic ETA System",

                "architecture": {
                    "next_station":
                        "Model 2 next-station CatBoost",

                    "later_stations":
                        "Guarded residual Model 3",

                    "provider_forecast_usage":
                        "comparison_only",
                },

                "leakage_safe": True,
            },

            "journey": {
                "journey_id":
                    str(journey_id),

                "train_number":
                    str(train_number),

                "train_name": (
                    str(train_name)
                    if train_name is not None
                    else None
                ),

                "journey_start_date": (
                    timestamp_to_indian_iso(
                        journey_start_date
                    )
                    if journey_start_date is not None
                    else None
                ),

                "schedule": schedule,
                "source": (
                    {
                        "station_code": (
                            str(source_row.get("station_code"))
                            if source_row is not None
                            and pd.notna(
                                source_row.get("station_code")
                            )
                            else None
                        ),
                        "station_name": (
                            str(source_row.get("station_name"))
                            if source_row is not None
                            and pd.notna(
                                source_row.get("station_name")
                            )
                            else None
                        ),
                        "scheduled_departure":
                            timestamp_to_indian_iso(
                                source_row.get(
                                    "scheduled_departure"
                                )
                            )
                            if source_row is not None
                            else None,
                    }
                    if source_row is not None
                    else None
                ),

                "destination": (
                    {
                        "station_code": (
                            str(
                                destination_row.get(
                                    "station_code"
                                )
                            )
                            if destination_row is not None
                            and pd.notna(
                                destination_row.get(
                                    "station_code"
                                )
                            )
                            else None
                        ),
                        "station_name": (
                            str(
                                destination_row.get(
                                    "station_name"
                                )
                            )
                            if destination_row is not None
                            and pd.notna(
                                destination_row.get(
                                    "station_name"
                                )
                            )
                            else None
                        ),
                        "scheduled_arrival":
                            timestamp_to_indian_iso(
                                destination_row.get(
                                    "scheduled_arrival"
                                )
                            )
                            if destination_row is not None
                            else None,
                    }
                    if destination_row is not None
                    else None
                ),

                "current_station_code": (
                    str(current_station_code)
                    if current_station_code
                    is not None
                    else None
                ),

                "current_station_name": (
                    str(current_station_name)
                    if current_station_name
                    is not None
                    else None
                ),

                "current_observed_arrival":
                    timestamp_to_indian_iso(
                        current_arrival
                    ),

                "current_delay_min":
                    safe_json_number(
                        current_delay,
                        digits=1,
                    ),

                "observed_stations":
                    int(observed_mask.sum()),

                "upcoming_stations": (
    0
                    if preflight_state == "COMPLETED"
                    else upcoming_count
                ),

                "timeline":
                    timeline,

                "state_source": (
                    "COMPLETED"
                    if preflight_state == "COMPLETED"
                    else
                    "SCHEDULED_NOT_STARTED"
                    if preflight_state == "SCHEDULED_NOT_STARTED"
                    else
                    "NORMALIZED_LIVE_JOURNEY_NO_UPCOMING_STATIONS"
                    if preflight_state == "NO_UPCOMING_STATIONS"
                    else
                    "INSUFFICIENT_VERIFIED_OBSERVATIONS"
                ),
            },

            "predictions": [],

            "message": (
                "This journey has been completed."
                if preflight_state == "COMPLETED"
                else
                "This journey is scheduled but has not started yet."
                if preflight_state == "SCHEDULED_NOT_STARTED"
                else
                "No upcoming stations are available "
                "for this journey."
                if preflight_state == "NO_UPCOMING_STATIONS"
                else
                "Live journey data is available, but "
                "there are not yet enough verified "
                "observations for leakage-safe ML prediction."
            ),
        }

    route_df = (
        normalized_journey_df
        .copy()
        .reset_index(drop=True)
    )

    observed_mask = (
        route_df["arrival_is_observed"]
        .fillna(False)
        .astype(bool)
    )

    observed_df = route_df.loc[
        observed_mask
    ].copy()

    if observed_df.empty:
        raise ValueError(
            "At least one verified observed arrival "
            "is required for dynamic ETA prediction."
        )

    sort_column = (
        "halt_order"
        if "halt_order" in observed_df.columns
        else "station_sequence"
    )

    observed_df = observed_df.sort_values(
        sort_column
    )

    current_row = observed_df.iloc[-1]

    first_prediction = predictions_df.iloc[0]

    journey_id = (
        str(first_prediction.get("journey_id"))
        if pd.notna(
            first_prediction.get("journey_id")
        )
        else None
    )

    train_number = (
        str(first_prediction.get("train_number"))
        if pd.notna(
            first_prediction.get("train_number")
        )
        else None
    )

    train_name = (
        str(first_prediction.get("train_name"))
        if pd.notna(
            first_prediction.get("train_name")
        )
        else None
    )

    current_station_code = str(
        current_row.get(
            "station_code",
            first_prediction.get(
                "current_station_code",
                "",
            ),
        )
    )

    current_station_name = str(
        current_row.get(
            "station_name",
            current_station_code,
        )
    )

    current_arrival = current_row.get(
        "actual_arrival"
    )

    current_delay = current_row.get(
        "arrival_delay_min"
    )

    if pd.isna(current_delay):
        current_delay = current_row.get(
            "calculated_arrival_delay_min"
        )

    station_predictions = []

    for _, prediction_row in (
        predictions_df
        .sort_values("stations_ahead")
        .iterrows()
    ):
        engine = str(
            prediction_row["prediction_engine"]
        )

        fallback_used = bool(
            prediction_row["fallback_used"]
        )

        interval_radius = safe_json_number(
            prediction_row[
                "prediction_interval_radius_min"
            ],
            digits=1,
        )

        predicted_delay = safe_json_number(
            prediction_row[
                "predicted_arrival_delay_min"
            ],
            digits=1,
        )

        recent_baseline = safe_json_number(
            prediction_row[
                "recent_delay_baseline_min"
            ],
            digits=1,
        )

        model2_prediction = safe_json_number(
            prediction_row[
                "model2_prediction_min"
            ],
            digits=1,
        )

        model3_prediction = safe_json_number(
            prediction_row[
                "model3_prediction_min"
            ],
            digits=1,
        )

        if engine == "MODEL_2_NEXT_STATION":
            confidence = "HIGH"
            explanation = (
                "Immediate next-station ETA generated by "
                "Model 2, the cross-domain validated "
                "next-station specialist."
            )

        elif engine == "MODEL_3_NEXT_STATION_FALLBACK":
            confidence = "MEDIUM"
            explanation = (
                "Model 2 was unavailable, so the guarded "
                "multi-horizon Model 3 prediction was used."
            )

        else:
            confidence = "MEDIUM"
            explanation = (
                "Multi-horizon ETA generated from the "
                "recent observed-delay baseline plus the "
                "guarded Model 3 correction."
            )

        station_response = {
            "station": {
                "code": str(
                    prediction_row[
                        "target_station_code"
                    ]
                ),
                "name": str(
                    prediction_row[
                        "target_station_name"
                    ]
                ),
                "stations_ahead": int(
                    prediction_row[
                        "stations_ahead"
                    ]
                ),
                "distance_km": safe_json_number(
                    prediction_row[
                        "distance_to_target_km"
                    ],
                    digits=1,
                ),
            },

            "schedule": {
                "arrival": timestamp_to_indian_iso(
                    prediction_row[
                        "target_scheduled_arrival"
                    ]
                ),
            },

            "forecast": {
                "eta": timestamp_to_indian_iso(
                    prediction_row[
                        "predicted_eta"
                    ]
                ),
                "predicted_delay_min":
                    predicted_delay,

                "delay_status": str(
                    prediction_row[
                        "delay_status"
                    ]
                ),

                "lower_eta": timestamp_to_indian_iso(
                    prediction_row["eta_lower"]
                ),

                "upper_eta": timestamp_to_indian_iso(
                    prediction_row["eta_upper"]
                ),

                "interval_radius_min":
                    interval_radius,

                "confidence":
                    confidence,
            },

            "model": {
                "prediction_engine":
                    engine,

                "model2_prediction_min":
                    model2_prediction,

                "model3_prediction_min":
                    model3_prediction,

                "recent_delay_baseline_min":
                    recent_baseline,

                "fallback_used":
                    fallback_used,

                "fallback_reason": (
                    prediction_row[
                        "fallback_reason"
                    ]
                    if fallback_used
                    else None
                ),
            },

            "explanation":
                explanation,

            "comparison_only": {
                "provider_eta":
                    timestamp_to_indian_iso(
                        prediction_row.get(
                            "provider_estimated_arrival"
                        )
                    ),

                "provider_delay_min":
                    safe_json_number(
                        prediction_row.get(
                            "provider_predicted_delay_min"
                        ),
                        digits=1,
                    ),
            },
        }

        station_predictions.append(
            station_response
        )

    timeline = build_journey_timeline(
        normalized_journey_df=route_df,
        predictions=station_predictions,
    )

    return {
        "success": True,

        "system": {
            "name":
                "SIH 26028 Hybrid Dynamic ETA System",

            "architecture": {
                "next_station":
                    "Model 2 next-station CatBoost",

                "later_stations":
                    "Guarded residual Model 3",

                "provider_forecast_usage":
                    "comparison_only",
            },

            "leakage_safe": True,
        },

        "journey": {
            "journey_id":
                journey_id,

            "train_number":
                train_number,

            "train_name":
                train_name,

            "current_station_code":
                current_station_code,

            "current_station_name":
                current_station_name,

            "current_observed_arrival":
                timestamp_to_indian_iso(
                    current_arrival
                ),

            "current_delay_min":
                safe_json_number(
                    current_delay,
                    digits=1,
                ),

            "observed_stations":
                int(observed_mask.sum()),

            "upcoming_stations":
                int(len(predictions_df)),
            "timeline": timeline,
        },

        "predictions":
            station_predictions,
    }


def build_hybrid_eta_service_response(
    normalized_journey_df: pd.DataFrame,
    *,
    hybrid_predictor: Callable[[pd.DataFrame], pd.DataFrame],
    model2: Any,
    model2_feature_order: list[str],
    model2_categorical_features: list[str],
):
    response = (
        build_hybrid_eta_service_response_v1(
            normalized_journey_df,
            hybrid_predictor=hybrid_predictor,
        )
    )

    if (
        not response.get("success")
        or not response.get("predictions")
        or response.get("journey") is None
    ):
        return response

    try:
        model2_state = predict_model2_next_station(
            normalized_journey_df=normalized_journey_df,
            model=model2,
            feature_order=model2_feature_order,
            categorical_features=
                model2_categorical_features,
        )
    except Exception:
        model2_state = {}

    inference_current_station_code = str(
        model2_state.get(
            "current_station_code",
            "",
        )
        or ""
    ).strip().upper()

    if not inference_current_station_code:
        return response

    route_df = (
        normalized_journey_df
        .copy()
        .reset_index(drop=True)
    )

    station_code_series = (
        route_df["station_code"]
        .astype(str)
        .str.strip()
        .str.upper()
    )

    matching_current_rows = route_df.loc[
        station_code_series.eq(
            inference_current_station_code
        )
    ].copy()

    if matching_current_rows.empty:
        return response

    if (
        "arrival_is_observed"
        in matching_current_rows.columns
    ):
        verified_matching_rows = (
            matching_current_rows.loc[
                matching_current_rows[
                    "arrival_is_observed"
                ]
                .fillna(False)
                .astype(bool)
            ]
        )

        if not verified_matching_rows.empty:
            matching_current_rows = (
                verified_matching_rows
            )

    current_row = (
        matching_current_rows.iloc[-1]
    )

    current_station_name = current_row.get(
        "station_name",
        inference_current_station_code,
    )

    current_observed_arrival = (
        current_row.get(
            "actual_arrival"
        )
    )

    current_delay = current_row.get(
        "arrival_delay_min"
    )

    if (
        current_delay is None
        or pd.isna(current_delay)
    ):
        current_delay = current_row.get(
            "calculated_arrival_delay_min"
        )

    response["journey"][
        "current_station_code"
    ] = inference_current_station_code

    response["journey"][
        "current_station_name"
    ] = str(current_station_name)

    response["journey"][
        "current_observed_arrival"
    ] = timestamp_to_indian_iso(
        current_observed_arrival
    )

    response["journey"][
        "current_delay_min"
    ] = safe_json_number(
        current_delay,
        digits=1,
    )

    response["journey"][
        "state_source"
    ] = (
        "MODEL_2_LEAKAGE_SAFE_CURRENT_STATE"
    )

    return response
