import json
from pathlib import Path

import pandas as pd
import pytest

from tests.regression.legacy_runtime import ml_runtime
from app.inference.artifacts import load_artifacts
from app.inference.model2 import predict_model2_next_station
from app.inference.normalizer import normalize_live_journey


PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEMO_PATH = (
    PROJECT_ROOT
    / "ml_handoff"
    / "raileta_space"
    / "demo"
    / "saved_journey_12615.json"
)


def test_new_model2_matches_runtime():
    with DEMO_PATH.open("r", encoding="utf-8") as file:
        api_result = json.load(file)

    normalized_df = normalize_live_journey(
        api_result,
        collected_at="2026-09-01T00:00:00+00:00",
    )

    artifacts = load_artifacts()

    expected = (
        ml_runtime.predict_model2_next_station(
            normalized_df
        )
    )

    actual = predict_model2_next_station(
        normalized_journey_df=normalized_df,
        model=artifacts.model2,
        feature_order=
            artifacts.model2_metadata["features"],
        categorical_features=
            artifacts.model2_metadata[
                "categorical_features"
            ],
    )

    assert actual["train_number"] == expected["train_number"]

    assert (
        actual["current_station_code"]
        == expected["current_station_code"]
    )

    assert (
        actual["next_station_code"]
        == expected["next_station_code"]
    )

    assert actual["current_delay_min"] == pytest.approx(
        expected["current_delay_min"],
        abs=1e-9,
    )

    assert actual["model2_raw_prediction_min"] == pytest.approx(
        expected["model2_raw_prediction_min"],
        abs=1e-9,
    )

    assert actual["model2_prediction_min"] == pytest.approx(
        expected["model2_prediction_min"],
        abs=1e-9,
    )

    assert (
        actual["model2_applicable"]
        == expected["model2_applicable"]
    )

    assert (
        actual["not_applicable_reason"]
        == expected["not_applicable_reason"]
    )

    assert (
        actual["policy_override"]
        == expected["policy_override"]
    )

    pd.testing.assert_frame_equal(
        actual["features"],
        expected["features"],
        check_dtype=True,
        check_exact=False,
        rtol=1e-9,
        atol=1e-9,
    )