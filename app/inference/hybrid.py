from typing import Any

import numpy as np
import pandas as pd

from app.inference.model2 import predict_model2_next_station


def predict_hybrid_station_etas(
    normalized_journey_df: pd.DataFrame,
    *,
    model2: Any,
    model2_feature_order: list[str],
    model2_categorical_features: list[str],
    model3_predictor,
    model3_result_extractor,
    next_station_interval_radius_min: float,
) -> pd.DataFrame:

    if not isinstance(
        normalized_journey_df,
        pd.DataFrame,
    ):
        raise TypeError(
            "normalized_journey_df must be a pandas DataFrame."
        )

    if normalized_journey_df.empty:
        raise ValueError(
            "The normalized journey DataFrame is empty."
        )

    required_columns = [
        "station_code",
        "station_status",
        "arrival_is_observed",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in normalized_journey_df.columns
    ]

    if missing_columns:
        raise KeyError(
            "Normalized journey is missing columns: "
            f"{missing_columns}"
        )

    if "journey_id" in normalized_journey_df.columns:
        journey_count = (
            normalized_journey_df["journey_id"]
            .dropna()
            .astype(str)
            .nunique()
        )

        if journey_count > 1:
            raise ValueError(
                "Hybrid inference accepts exactly "
                "one train journey at a time."
            )

    # ---------------------------
    # Model 3 for all horizons
    # ---------------------------

    model3_result = model3_predictor(
        normalized_journey_df
    )

    (
        model3_predictions_df,
        model3_journey_summary,
    ) = model3_result_extractor(
        model3_result
    )

    hybrid_predictions_df = (
        model3_predictions_df
        .copy()
    )

    if hybrid_predictions_df.empty:
        return hybrid_predictions_df

    hybrid_predictions_df = (
        hybrid_predictions_df
        .sort_values("stations_ahead")
        .reset_index(drop=True)
    )

    required_prediction_columns = [
        "target_station_code",
        "stations_ahead",
        "target_scheduled_arrival",
        "recent_delay_baseline_min",
        "predicted_residual_correction_min",
        "predicted_arrival_delay_min",
        "predicted_eta",
        "eta_lower",
        "eta_upper",
        "prediction_interval_radius_min",
    ]

    missing_prediction_columns = [
        column
        for column in required_prediction_columns
        if column not in hybrid_predictions_df.columns
    ]

    if missing_prediction_columns:
        raise KeyError(
            "Model 3 prediction output is missing columns: "
            f"{missing_prediction_columns}"
        )

    hybrid_predictions_df[
        "model3_prediction_min"
    ] = pd.to_numeric(
        hybrid_predictions_df[
            "predicted_arrival_delay_min"
        ],
        errors="coerce",
    )

    hybrid_predictions_df[
        "model2_prediction_min"
    ] = np.nan

    hybrid_predictions_df[
        "prediction_engine"
    ] = "MODEL_3_MULTI_HORIZON"

    hybrid_predictions_df[
        "fallback_used"
    ] = False

    hybrid_predictions_df[
        "fallback_reason"
    ] = None

    # ---------------------------
    # Model 2 for next station
    # ---------------------------

    try:
        model2_result = predict_model2_next_station(
            normalized_journey_df=normalized_journey_df,
            model=model2,
            feature_order=model2_feature_order,
            categorical_features=model2_categorical_features,
        )

        if not isinstance(model2_result, dict):
            raise TypeError(
                "Model 2 must return a dictionary, "
                f"received {type(model2_result).__name__}."
            )

    except Exception as error:
        model2_result = {
            "model2_applicable": False,
            "model2_prediction_min": None,
            "next_station_code": None,
            "not_applicable_reason": (
                "Model 2 inference error: "
                f"{type(error).__name__}: {error}"
            ),
        }

    model2_applicable = bool(
        model2_result.get(
            "model2_applicable",
            False,
        )
    )

    model2_prediction_raw = model2_result.get(
        "model2_prediction_min"
    )

    try:
        model2_prediction = float(
            model2_prediction_raw
        )

        model2_prediction_is_valid = (
            np.isfinite(model2_prediction)
        )

    except (TypeError, ValueError):
        model2_prediction = np.nan
        model2_prediction_is_valid = False

    next_station_code = str(
        model2_result.get(
            "next_station_code",
            "",
        )
        or ""
    ).strip().upper()

    first_station_mask = (
        pd.to_numeric(
            hybrid_predictions_df["stations_ahead"],
            errors="coerce",
        )
        .eq(1)
    )

    next_station_mask = (
        first_station_mask
        &
        hybrid_predictions_df[
            "target_station_code"
        ]
        .astype(str)
        .str.strip()
        .str.upper()
        .eq(next_station_code)
    )

    if not next_station_mask.any():
        next_station_mask = first_station_mask

    if (
        model2_applicable
        and model2_prediction_is_valid
        and next_station_mask.any()
    ):
        next_index = hybrid_predictions_df.index[
            next_station_mask
        ][0]

        baseline_prediction = pd.to_numeric(
            pd.Series(
                [
                    hybrid_predictions_df.at[
                        next_index,
                        "recent_delay_baseline_min",
                    ]
                ]
            ),
            errors="coerce",
        ).iloc[0]

        scheduled_arrival = pd.to_datetime(
            hybrid_predictions_df.at[
                next_index,
                "target_scheduled_arrival",
            ],
            utc=True,
            errors="coerce",
        )

        if pd.isna(scheduled_arrival):
            raise ValueError(
                "Next station has no valid "
                "scheduled arrival timestamp."
            )

        hybrid_eta = (
            scheduled_arrival
            + pd.to_timedelta(
                model2_prediction,
                unit="minute",
            )
        )

        interval_delta = pd.to_timedelta(
            next_station_interval_radius_min,
            unit="minute",
        )

        hybrid_predictions_df.at[
            next_index,
            "model2_prediction_min",
        ] = model2_prediction

        hybrid_predictions_df.at[
            next_index,
            "predicted_arrival_delay_min",
        ] = model2_prediction

        if pd.notna(baseline_prediction):
            hybrid_predictions_df.at[
                next_index,
                "predicted_residual_correction_min",
            ] = (
                model2_prediction
                - float(baseline_prediction)
            )
        else:
            hybrid_predictions_df.at[
                next_index,
                "predicted_residual_correction_min",
            ] = np.nan

        hybrid_predictions_df.at[
            next_index,
            "predicted_eta",
        ] = hybrid_eta

        hybrid_predictions_df.at[
            next_index,
            "eta_lower",
        ] = hybrid_eta - interval_delta

        hybrid_predictions_df.at[
            next_index,
            "eta_upper",
        ] = hybrid_eta + interval_delta

        hybrid_predictions_df.at[
            next_index,
            "prediction_interval_radius_min",
        ] = next_station_interval_radius_min

        hybrid_predictions_df.at[
            next_index,
            "prediction_engine",
        ] = "MODEL_2_NEXT_STATION"

    else:
        fallback_reason = model2_result.get(
            "not_applicable_reason"
        )

        if not fallback_reason:
            fallback_reason = (
                "Model 2 returned no valid "
                "next-station prediction."
            )

        hybrid_predictions_df.loc[
            first_station_mask,
            "prediction_engine",
        ] = "MODEL_3_NEXT_STATION_FALLBACK"

        hybrid_predictions_df.loc[
            first_station_mask,
            "fallback_used",
        ] = True

        hybrid_predictions_df.loc[
            first_station_mask,
            "fallback_reason",
        ] = str(fallback_reason)

    predicted_delay = pd.to_numeric(
        hybrid_predictions_df[
            "predicted_arrival_delay_min"
        ],
        errors="coerce",
    )

    hybrid_predictions_df[
        "delay_status"
    ] = np.select(
        [
            predicted_delay < -1,
            predicted_delay > 5,
        ],
        [
            "EARLY",
            "LATE",
        ],
        default="ON_TIME",
    )

    hybrid_predictions_df[
        "model_component_summary"
    ] = np.select(
        [
            hybrid_predictions_df[
                "prediction_engine"
            ].eq("MODEL_2_NEXT_STATION"),

            hybrid_predictions_df[
                "prediction_engine"
            ].eq(
                "MODEL_3_NEXT_STATION_FALLBACK"
            ),
        ],
        [
            (
                "Model 2 direct next-station "
                "delay prediction"
            ),
            (
                "Model 3 used because Model 2 "
                "was unavailable"
            ),
        ],
        default=(
            "Recent-delay baseline plus guarded "
            "Model 3 multi-horizon correction"
        ),
    )

    return hybrid_predictions_df