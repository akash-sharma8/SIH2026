import json
from pathlib import Path

from app.inference.artifacts import load_artifacts
from app.inference.explainability import (
    build_model3_explanation,
)
from app.inference.normalizer import (
    normalize_live_journey,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEMO_PATH = (
    PROJECT_ROOT
    / "ml_handoff"
    / "raileta_space"
    / "demo"
    / "saved_journey_12615.json"
)


def test_model3_explanation_reconstructs_prediction():
    artifacts = load_artifacts()

    with DEMO_PATH.open(
        "r",
        encoding="utf-8",
    ) as file:
        api_result = json.load(file)

    normalized_df = normalize_live_journey(
        api_result
    )

    result = build_model3_explanation(
        normalized_df,
        model=artifacts.model3,
        model3_config=artifacts.model3_config,
        stations_ahead=2,
        top_k=5,
    )

    assert result["method"] == "SHAP"
    assert result["explanation_available"] is True

    assert len(result["factors"]) <= 5

    assert all(
        factor["source"] == "MODEL_3_SHAP"
        for factor in result["factors"]
    )

    assert result["stations_ahead"] == 2
    assert result["current_station_code"]
    assert result["target_station_code"]

    assert (
        result["served_prediction_min"]
        >= 0
    )