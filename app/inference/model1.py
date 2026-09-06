from typing import Any

import numpy as np
import pandas as pd


MODEL1_CRITICAL_FEATURES = [
    "train_number",
    "train_type",
    "late_incoming_rake",
    "season_severity_score",
    "route_historical_ontime_pct",
    "distance_km",
    "scheduled_travel_hours",
]


def classify_model1_destination_risk(
    predicted_delay_min,
):
    if pd.isna(predicted_delay_min):
        return "UNKNOWN"

    predicted_delay_min = float(
        predicted_delay_min
    )

    if predicted_delay_min <= 15:
        return "LOW"

    if predicted_delay_min <= 60:
        return "MODERATE"

    if predicted_delay_min <= 120:
        return "HIGH"

    return "SEVERE"


def predict_model1_predeparture(
    journey_features,
    *,
    model: Any,
    metadata: dict,
    strict: bool = True,
):
    if isinstance(
        journey_features,
        pd.Series,
    ):
        journey_features = (
            journey_features.to_dict()
        )

    if not isinstance(
        journey_features,
        dict,
    ):
        raise TypeError(
            "journey_features must be a dictionary "
            "or pandas Series."
        )

    model_config = metadata["model"]

    deployed_features = (
        model_config["features"]
    )

    categorical_features = (
        model_config[
            "categorical_features"
        ]
    )

    category_mappings = (
        model_config[
            "category_mappings"
        ]
    )

    interval_radius_min = float(
        metadata[
            "uncertainty"
        ]["radius_min"]
    )

    missing_features = [
        feature
        for feature in deployed_features
        if (
            feature not in journey_features
            or journey_features[feature] is None
            or pd.isna(
                journey_features[feature]
            )
        )
    ]

    missing_critical_features = [
        feature
        for feature
        in MODEL1_CRITICAL_FEATURES
        if feature in missing_features
    ]

    if (
        strict
        and missing_critical_features
    ):
        raise ValueError(
            "Missing critical pre-departure features: "
            f"{missing_critical_features}"
        )

    inference_row = {
        feature:
            journey_features.get(
                feature,
                np.nan,
            )
        for feature
        in deployed_features
    }

    inference_df = pd.DataFrame(
        [inference_row],
        columns=deployed_features,
    )

    # Preserve Indian Railways leading zeros.
    if pd.notna(
        inference_df.at[
            0,
            "train_number",
        ]
    ):
        inference_df.at[
            0,
            "train_number",
        ] = (
            str(
                inference_df.at[
                    0,
                    "train_number",
                ]
            )
            .strip()
            .zfill(5)
        )

    unknown_categories = {}

    for categorical_feature in (
        categorical_features
    ):
        allowed_categories = (
            category_mappings[
                categorical_feature
            ]
        )

        raw_value = inference_df.at[
            0,
            categorical_feature,
        ]

        raw_value_string = (
            str(raw_value)
            if pd.notna(raw_value)
            else None
        )

        if (
            raw_value_string is not None
            and raw_value_string
            not in allowed_categories
        ):
            unknown_categories[
                categorical_feature
            ] = raw_value_string

        inference_df[
            categorical_feature
        ] = pd.Categorical(
            inference_df[
                categorical_feature
            ].astype(str),
            categories=allowed_categories,
        )

    numeric_features = [
        feature
        for feature
        in deployed_features
        if feature
        not in categorical_features
    ]

    for numeric_feature in (
        numeric_features
    ):
        inference_df[
            numeric_feature
        ] = pd.to_numeric(
            inference_df[
                numeric_feature
            ],
            errors="coerce",
        )

    predicted_delay_min = float(
        model.predict(
            inference_df,
            num_iteration=(
                model_config[
                    "best_iteration"
                ]
            ),
        )[0]
    )

    predicted_delay_min = max(
        0.0,
        predicted_delay_min,
    )

    lower_delay_min = max(
        0.0,
        predicted_delay_min
        - interval_radius_min,
    )

    upper_delay_min = (
        predicted_delay_min
        + interval_radius_min
    )

    completeness_pct = (
        100
        * (
            len(deployed_features)
            - len(missing_features)
        )
        / len(deployed_features)
    )

    if (
        missing_critical_features
        or unknown_categories
        or completeness_pct < 90
    ):
        confidence = "LOW"

    else:
        confidence = "MEDIUM"

    return {
        "success": True,

        "model": {
            "name":
                "Model 1 pre-departure LightGBM",

            "version":
                metadata[
                    "system"
                ]["version"],

            "role":
                "DESTINATION_DELAY_PRIOR",
        },

        "forecast": {
            "predicted_destination_delay_min":
                round(
                    predicted_delay_min,
                    1,
                ),

            "lower_delay_min":
                round(
                    lower_delay_min,
                    1,
                ),

            "upper_delay_min":
                round(
                    upper_delay_min,
                    1,
                ),

            "interval_radius_min":
                round(
                    interval_radius_min,
                    1,
                ),

            "risk_level":
                classify_model1_destination_risk(
                    predicted_delay_min
                ),

            "confidence":
                confidence,
        },

        "input_quality": {
            "feature_completeness_pct":
                round(
                    completeness_pct,
                    1,
                ),

            "missing_features":
                missing_features,

            "missing_critical_features":
                missing_critical_features,

            "unknown_categories":
                unknown_categories,
        },

        "limitations": [
            (
                "This is a destination-delay prior, "
                "not a station-level ETA."
            ),
            (
                "The model uses a Kaggle competition "
                "dataset rather than verified NTES history."
            ),
            (
                "Switch to Models 2 and 3 after real "
                "station observations become available."
            ),
        ],
    }