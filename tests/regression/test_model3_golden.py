import json
from pathlib import Path

import pandas as pd
import pytest

from tests.regression.legacy_runtime import ml_runtime
from app.inference.artifacts import load_artifacts
from app.inference.model3 import predict_upcoming_station_etas
from app.inference.normalizer import normalize_live_journey


PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEMO_PATH = (
    PROJECT_ROOT
    / "ml_handoff"
    / "raileta_space"
    / "demo"
    / "saved_journey_12615.json"
)


def test_new_model3_matches_runtime():
    with DEMO_PATH.open("r", encoding="utf-8") as file:
        api_result = json.load(file)

    normalized_df = normalize_live_journey(
        api_result,
        collected_at="2026-09-01T00:00:00+00:00",
    )

    artifacts = load_artifacts()

    expected_predictions, expected_summary = (
        ml_runtime.predict_upcoming_station_etas(
            normalized_df
        )
    )

    actual_predictions, actual_summary = (
        predict_upcoming_station_etas(
            normalized_journey_df=normalized_df,
            model=artifacts.model3,
            model3_config=artifacts.model3_config,
        )
    )

    pd.testing.assert_frame_equal(
        actual_predictions,
        expected_predictions,
        check_dtype=True,
        check_exact=False,
        rtol=1e-9,
        atol=1e-9,
    )

    assert (
        actual_summary["journey_id"]
        == expected_summary["journey_id"]
    )

    assert (
        actual_summary["train_number"]
        == expected_summary["train_number"]
    )

    assert (
        actual_summary["current_station_code"]
        == expected_summary["current_station_code"]
    )

    assert actual_summary["current_delay_min"] == pytest.approx(
        expected_summary["current_delay_min"],
        abs=1e-9,
    )

    assert (
        actual_summary["upcoming_stations"]
        == expected_summary["upcoming_stations"]
    )