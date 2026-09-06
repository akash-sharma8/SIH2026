from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from catboost import Pool


def explanation_safe_value(value):
    if value is None or pd.isna(value):
        return None

    if isinstance(value, np.generic):
        return value.item()

    return value


def unavailable_explanation(
    source: str,
) -> dict[str, Any]:
        return {
        "method": "UNAVAILABLE",
        "factors": [],
        "explanation_available": False,
        "source": source,
        "causal": None,
        "interpretation": None,
    }



def build_model1_explanation(
    journey_features: dict[str, Any],
    *,
    model: Any,
    metadata: dict,
    top_k: int = 5,
) -> dict[str, Any]:
    model_config = metadata["model"]

    feature_order = list(
        model_config["features"]
    )

    categorical_features = list(
        model_config["categorical_features"]
    )

    category_mappings = (
        model_config["category_mappings"]
    )

    frame = pd.DataFrame(
        [
            {
                feature: journey_features.get(
                    feature,
                    np.nan,
                )
                for feature in feature_order
            }
        ],
        columns=feature_order,
    )

    if pd.notna(
        frame.at[0, "train_number"]
    ):
        frame.at[0, "train_number"] = (
            str(
                frame.at[
                    0,
                    "train_number",
                ]
            )
            .strip()
            .zfill(5)
        )

    for feature in categorical_features:
        frame[feature] = pd.Categorical(
            frame[feature].astype(str),
            categories=category_mappings[
                feature
            ],
        )

    for feature in feature_order:
        if feature not in categorical_features:
            frame[feature] = pd.to_numeric(
                frame[feature],
                errors="coerce",
            )

    if model.feature_name() != feature_order:
        raise ValueError(
            "Model 1 feature contract mismatch."
        )

    best_iteration = int(
        model_config["best_iteration"]
    )

    raw_prediction = float(
        model.predict(
            frame,
            num_iteration=best_iteration,
            raw_score=True,
            validate_features=True,
        )[0]
    )

    contributions = model.predict(
        frame,
        num_iteration=best_iteration,
        pred_contrib=True,
        validate_features=True,
    )

    if hasattr(
        contributions,
        "toarray",
    ):
        contributions = (
            contributions.toarray()
        )

    shap_values = np.asarray(
        contributions
    )[0]

    reconstructed_raw = float(
        shap_values[-1]
        + shap_values[:-1].sum()
    )

    if not np.isclose(
        reconstructed_raw,
        raw_prediction,
        atol=1e-6,
        rtol=1e-7,
    ):
        raise AssertionError(
            "Model 1 raw SHAP reconstruction failed."
        )

    if (
        len(shap_values)
        != len(feature_order) + 1
    ):
        raise ValueError(
            "Model 1 SHAP shape mismatch."
        )

    clipped_prediction = max(
        0.0,
        raw_prediction,
    )

    served_prediction = round(
        clipped_prediction,
        1,
    )

    reconstructed_served = round(
        max(
            0.0,
            reconstructed_raw,
        ),
        1,
    )

    if not np.isclose(
        reconstructed_served,
        served_prediction,
        atol=1e-9,
        rtol=0,
    ):
        raise AssertionError(
            "Model 1 served prediction "
            "reconstruction failed."
        )

    factors = []

    for feature, contribution in zip(
        feature_order,
        shap_values[:-1],
    ):
        contribution = float(
            contribution
        )

        factors.append(
            {
                "feature": feature,
                "display_name": (
                    feature
                    .replace("_", " ")
                    .title()
                ),
                "value": explanation_safe_value(
                    frame.iloc[0][feature]
                ),
                "contribution": contribution,
                "direction": (
                    "INCREASES_DELAY"
                    if contribution > 1e-9
                    else "REDUCES_DELAY"
                    if contribution < -1e-9
                    else "NEUTRAL"
                ),
                "source": "MODEL_1_SHAP",
            }
        )

    factors.sort(
        key=lambda item: abs(
            item["contribution"]
        ),
        reverse=True,
    )

    top_factors = factors[:top_k]

    for rank, factor in enumerate(
        top_factors,
        start=1,
    ):
        factor["rank"] = rank

    return {
        "method": "SHAP",
        "factors": top_factors,
        "explanation_available": True,
        "source": "MODEL_1_SHAP",
        "served_prediction_min":
            served_prediction,
        "causal": False,
        "interpretation": (
            "SHAP values explain the model's prediction "
            "and should not be interpreted as causal effects."
        ),
    }

def build_model2_explanation(
    normalized_journey_df: pd.DataFrame,
    *,
    model: Any,
    feature_order: list[str],
    categorical_features: list[str],
    top_k: int = 5,
) -> dict[str, Any]:
    from app.inference.model2 import (
        build_model2_live_features,
        predict_model2_next_station,
    )

    response = predict_model2_next_station(
        normalized_journey_df,
        model=model,
        feature_order=feature_order,
        categorical_features=categorical_features,
    )

    if not response.get(
        "model2_applicable",
        False,
    ):
        raise ValueError(
            "Model 2 unavailable: "
            + str(
                response.get(
                    "not_applicable_reason"
                )
            )
        )

    frame, current, target = (
        build_model2_live_features(
            normalized_journey_df,
            feature_order,
            categorical_features,
        )
    )

    if (
        list(model.feature_names_)
        != frame.columns.tolist()
    ):
        raise ValueError(
            "Model 2 feature contract mismatch."
        )

    pool = Pool(
        frame,
        cat_features=(
            model.get_cat_feature_indices()
        ),
        feature_names=frame.columns.tolist(),
    )

    raw_prediction = float(
        np.asarray(
            model.predict(
                pool,
                prediction_type="RawFormulaVal",
            )
        ).reshape(-1)[0]
    )

    served_prediction = float(
        response["model2_prediction_min"]
    )

    if not np.isclose(
        raw_prediction,
        served_prediction,
        atol=1e-6,
        rtol=1e-7,
    ):
        raise ValueError(
            "Model 2 explanation unavailable "
            "because served prediction includes "
            "postprocessing."
        )

    contributions = (
        model.get_feature_importance(
            pool,
            type="ShapValues",
            thread_count=2,
            verbose=False,
        )
    )

    shap_values = np.asarray(
        contributions
    )[0]

    reconstructed_raw = float(
        shap_values[-1]
        + shap_values[:-1].sum()
    )

    if not np.isclose(
        reconstructed_raw,
        raw_prediction,
        atol=1e-6,
        rtol=1e-7,
    ):
        raise AssertionError(
            "Model 2 SHAP reconstruction failed."
        )

    factors = []

    for feature, contribution in zip(
        frame.columns,
        shap_values[:-1],
    ):
        contribution = float(
            contribution
        )

        factors.append(
            {
                "feature": feature,
                "display_name": (
                    feature
                    .replace("_", " ")
                    .title()
                ),
                "value": explanation_safe_value(
                    frame.iloc[0][feature]
                ),
                "contribution": contribution,
                "direction": (
                    "INCREASES_DELAY"
                    if contribution > 1e-9
                    else "REDUCES_DELAY"
                    if contribution < -1e-9
                    else "NEUTRAL"
                ),
                "source": "MODEL_2_SHAP",
            }
        )

    factors.sort(
        key=lambda item: abs(
            item["contribution"]
        ),
        reverse=True,
    )

    top_factors = factors[:top_k]

    for rank, factor in enumerate(
        top_factors,
        start=1,
    ):
        factor["rank"] = rank

    return {
        "method": "SHAP",
        "factors": top_factors,
        "explanation_available": True,
        "source": "MODEL_2_SHAP",
        "served_prediction_min":
            served_prediction,
        "current_station_code":
            str(current["station_code"]),
        "target_station_code":
            str(target["station_code"]),
                "causal": False,
        "interpretation": (
            "SHAP values explain the model's prediction "
            "and should not be interpreted as causal effects."
        ),
    }


def build_model3_explanation(
    normalized_journey_df: pd.DataFrame,
    *,
    model: Any,
    model3_config: dict,
    stations_ahead: int,
    top_k: int = 5,
) -> dict[str, Any]:
    from app.inference.model3 import (
        build_live_inference_rows,
        predict_upcoming_station_etas,
    )

    inference_rows, current = (
        build_live_inference_rows(
            normalized_journey_df
        )
    )

    selected = inference_rows.loc[
        pd.to_numeric(
            inference_rows["stations_ahead"]
        ).eq(stations_ahead)
    ].copy()

    if len(selected) != 1:
        raise ValueError(
            "Requested Model 3 target is not unique."
        )

    feature_order = list(
        model3_config["features"]
    )

    frame = selected[
        feature_order
    ].copy()

    for feature in feature_order:
        frame[feature] = pd.to_numeric(
            frame[feature],
            errors="coerce",
        )

    if (
        list(model.feature_names_)
        != feature_order
    ):
        raise ValueError(
            "Model 3 feature contract mismatch."
        )

    raw_prediction = float(
        np.asarray(
            model.predict(
                frame,
                prediction_type="RawFormulaVal",
            )
        ).reshape(-1)[0]
    )

    predictions, _ = (
        predict_upcoming_station_etas(
            normalized_journey_df,
            model=model,
            model3_config=model3_config,
        )
    )

    target_code = str(
        selected.iloc[0][
            "target_station_code"
        ]
    )

    match = predictions.loc[
        pd.to_numeric(
            predictions["stations_ahead"]
        ).eq(stations_ahead)
        & predictions[
            "target_station_code"
        ].astype(str).eq(target_code)
    ]

    if len(match) != 1:
        raise ValueError(
            "Served Model 3 target is not unique."
        )

    served_row = match.iloc[0]

    baseline = float(
        served_row[
            "recent_delay_baseline_min"
        ]
    )

    alpha = float(
        model3_config["residual_alpha"]
    )

    served_correction = float(
        served_row[
            "predicted_residual_correction_min"
        ]
    )

    served_prediction = float(
        served_row[
            "predicted_arrival_delay_min"
        ]
    )

    expected_correction = (
        alpha * raw_prediction
    )

    if not np.isclose(
        expected_correction,
        served_correction,
        atol=1e-6,
        rtol=1e-7,
    ):
        raise ValueError(
            "Model 3 explanation unavailable "
            "because served prediction includes "
            "residual clipping or guarding."
        )

    pool = Pool(
        frame,
        feature_names=feature_order,
    )

    contributions = (
        model.get_feature_importance(
            pool,
            type="ShapValues",
            thread_count=2,
            verbose=False,
        )
    )

    shap_values = np.asarray(
        contributions
    )[0]

    reconstructed_raw = float(
        shap_values[-1]
        + shap_values[:-1].sum()
    )

    if not np.isclose(
        reconstructed_raw,
        raw_prediction,
        atol=1e-6,
        rtol=1e-7,
    ):
        raise AssertionError(
            "Model 3 SHAP reconstruction failed."
        )

    reconstructed_served = (
        baseline
        + alpha * reconstructed_raw
    )

    if not np.isclose(
        reconstructed_served,
        served_prediction,
        atol=1e-6,
        rtol=1e-7,
    ):
        raise AssertionError(
            "Model 3 served prediction "
            "reconstruction failed."
        )

    factors = []

    for feature, contribution in zip(
        feature_order,
        shap_values[:-1],
    ):
        scaled_contribution = float(
            contribution
        ) * alpha

        factors.append(
            {
                "feature": feature,
                "display_name": (
                    feature
                    .replace("_", " ")
                    .title()
                ),
                "value": explanation_safe_value(
                    frame.iloc[0][feature]
                ),
                "contribution":
                    scaled_contribution,
                "direction": (
                    "INCREASES_DELAY"
                    if scaled_contribution > 1e-9
                    else "REDUCES_DELAY"
                    if scaled_contribution < -1e-9
                    else "NEUTRAL"
                ),
                "source": "MODEL_3_SHAP",
            }
        )

    factors.sort(
        key=lambda item: abs(
            item["contribution"]
        ),
        reverse=True,
    )

    top_factors = factors[:top_k]

    for rank, factor in enumerate(
        top_factors,
        start=1,
    ):
        factor["rank"] = rank

    return {
        "method": "SHAP",
        "factors": top_factors,
        "explanation_available": True,
        "source": "MODEL_3_SHAP",
        "served_prediction_min":
            served_prediction,
        "external_baseline_min":
            baseline,
        "stations_ahead":
            int(stations_ahead),
        "current_station_code":
            str(current["station_code"]),
        "target_station_code":
            target_code,
                "causal": False,
        "interpretation": (
            "SHAP values explain the model's prediction "
            "and should not be interpreted as causal effects."
        ),
    }

def build_live_prediction_explanation(
    normalized_journey_df: pd.DataFrame,
    *,
    artifacts: Any,
    predictions: list[dict[str, Any]],
    top_k: int = 5,
) -> dict[str, Any]:
    try:
        if not predictions:
            return unavailable_explanation(
                "NO_UPCOMING_PREDICTION"
            )

        first_prediction = predictions[0]

        stations_ahead = int(
            first_prediction.get(
                "station",
                {},
            ).get(
                "stations_ahead",
                1,
            )
        )

        if stations_ahead == 1:
            explanation = (
                build_model2_explanation(
                    normalized_journey_df,
                    model=artifacts.model2,
                    feature_order=(
                        artifacts.model2_metadata[
                            "features"
                        ]
                    ),
                    categorical_features=(
                        artifacts.model2_metadata[
                            "categorical_features"
                        ]
                    ),
                    top_k=top_k,
                )
            )
        else:
            explanation = (
                build_model3_explanation(
                    normalized_journey_df,
                    model=artifacts.model3,
                    model3_config=(
                        artifacts.model3_config
                    ),
                    stations_ahead=stations_ahead,
                    top_k=top_k,
                )
            )

        api_served_prediction = float(
            first_prediction[
                "forecast"
            ][
                "predicted_delay_min"
            ]
        )

        internal_served_prediction = float(
            explanation[
                "served_prediction_min"
            ]
        )

        if not np.isclose(
            round(
                internal_served_prediction,
                1,
            ),
            api_served_prediction,
            atol=1e-9,
            rtol=0,
        ):
            raise AssertionError(
                "Explanation does not match "
                "the API-served prediction."
            )

        explanation[
            "served_prediction_min"
        ] = api_served_prediction

        explanation[
            "stations_ahead"
        ] = stations_ahead

        return explanation

    except Exception:
        return unavailable_explanation(
            "MODEL_EXPLANATION_FAILED"
        )