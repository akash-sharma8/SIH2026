import json
from pathlib import Path

from app.inference.adapter import InferenceAdapter
from app.inference.artifacts import load_artifacts
from app.inference.explainability import (
    build_live_prediction_explanation,
)
from app.inference.normalizer import normalize_live_journey


PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEMO_PATH = (
    PROJECT_ROOT
    / "ml_handoff"
    / "raileta_space"
    / "demo"
    / "saved_journey_12615.json"
)


def test_live_explanation_aggregator_uses_served_prediction():
    artifacts = load_artifacts()

    with DEMO_PATH.open(
        "r",
        encoding="utf-8",
    ) as file:
        api_result = json.load(file)

    normalized_df = normalize_live_journey(
        api_result
    )

    response = InferenceAdapter(
        artifacts
    ).run_payload(api_result)

    predictions = response["predictions"]

    result = build_live_prediction_explanation(
        normalized_df,
        artifacts=artifacts,
        predictions=predictions,
        top_k=5,
    )

    assert result["method"] in {
        "SHAP",
        "UNAVAILABLE",
    }

    if result["explanation_available"]:
        assert len(result["factors"]) <= 5
        assert result["served_prediction_min"] >= 0


def test_live_explanation_aggregator_handles_no_predictions():
    artifacts = load_artifacts()

    result = build_live_prediction_explanation(
        normalized_journey_df=None,
        artifacts=artifacts,
        predictions=[],
        top_k=5,
    )

    assert result == {
        "method": "UNAVAILABLE",
        "factors": [],
        "explanation_available": False,
        "source": "NO_UPCOMING_PREDICTION",
        "causal": None,
        "interpretation": None,
    }