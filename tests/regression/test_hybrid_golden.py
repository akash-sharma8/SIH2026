import json
from pathlib import Path

import pandas as pd

from tests.regression.legacy_runtime import ml_runtime
from app.inference.artifacts import load_artifacts
from app.inference.hybrid import predict_hybrid_station_etas
from app.inference.normalizer import normalize_live_journey
from app.inference.model3 import (
    predict_upcoming_station_etas,
    extract_model3_prediction_result,
)
PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEMO_PATH = (
    PROJECT_ROOT
    / "ml_handoff"
    / "raileta_space"
    / "demo"
    / "saved_journey_12615.json"
)


def test_new_hybrid_matches_runtime():
    with DEMO_PATH.open("r", encoding="utf-8") as file:
        api_result = json.load(file)

    normalized_df = normalize_live_journey(
        api_result,
        collected_at="2026-09-01T00:00:00+00:00",
    )

    artifacts = load_artifacts()

    expected = ml_runtime.predict_hybrid_station_etas(
        normalized_df
    )

    actual = predict_hybrid_station_etas(
        normalized_journey_df=normalized_df,
        model2=artifacts.model2,
        model2_feature_order=
            artifacts.model2_metadata["features"],
        model2_categorical_features=
            artifacts.model2_metadata[
                "categorical_features"
            ],
        model3_predictor=lambda df: predict_upcoming_station_etas(
           normalized_journey_df=df,
           model=artifacts.model3,
           model3_config=artifacts.model3_config,
        ),
        model3_result_extractor=
            extract_model3_prediction_result,
        next_station_interval_radius_min=
            float(
                artifacts.fusion_config[
                    "next_station_interval_radius_min"
                ]
            ),
    )

    assert actual.shape == expected.shape

    assert list(actual.columns) == list(
        expected.columns
    )

    pd.testing.assert_frame_equal(
        actual,
        expected,
        check_dtype=True,
        check_exact=False,
        rtol=1e-9,
        atol=1e-9,
    )