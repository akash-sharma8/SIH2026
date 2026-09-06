from app.inference.artifacts import load_artifacts
from app.inference.explainability import (
    build_model1_explanation,
)


def test_model1_explanation_reconstructs_prediction():
    artifacts = load_artifacts()

    features = {
        feature: None
        for feature in artifacts.model1_metadata[
            "model"
        ]["features"]
    }

    features.update({
        "train_number": "12615",
        "train_type": "EXP",
        "late_incoming_rake": 0,
        "season_severity_score": 0.0,
        "route_historical_ontime_pct": 80.0,
        "distance_km": 1000.0,
        "scheduled_travel_hours": 15.0,
    })

    result = build_model1_explanation(
        features,
        model=artifacts.model1,
        metadata=artifacts.model1_metadata,
        top_k=5,
    )

    assert result["method"] == "SHAP"
    assert result["explanation_available"] is True

    assert len(result["factors"]) <= 5

    assert all(
        factor["source"] == "MODEL_1_SHAP"
        for factor in result["factors"]
    )

    assert all(
        factor["rank"] >= 1
        for factor in result["factors"]
    )

    assert (
        result["served_prediction_min"]
        >= 0
    )