import json
from pathlib import Path

import pandas as pd

from tests.regression.legacy_runtime import ml_runtime
from app.inference.normalizer import normalize_live_journey


PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEMO_PATH = (
    PROJECT_ROOT
    / "ml_handoff"
    / "raileta_space"
    / "demo"
    / "saved_journey_12615.json"
)


def test_new_normalizer_matches_runtime():
    with DEMO_PATH.open("r", encoding="utf-8") as file:
        api_result = json.load(file)

    collected_at = "2026-09-01T00:00:00+00:00"

    expected = ml_runtime.normalize_live_journey(
        api_result,
        collected_at=collected_at,
    )

    actual = normalize_live_journey(
        api_result,
        collected_at=collected_at,
    )

    assert actual.shape == expected.shape

    assert list(actual.columns) == list(expected.columns)

    pd.testing.assert_frame_equal(
        actual,
        expected,
        check_dtype=True,
        check_exact=False,
        rtol=1e-9,
        atol=1e-9,
    )