from app.schemas.model_diagnostics import (
    ModelDiagnostics,
    ModelEvaluationMetrics,
    PredictionExplanation,
    PredictionFactor,
)


def test_prediction_factor_schema():
    factor = PredictionFactor(
        feature="current_delay_min",
        display_name="Current observed delay",
        value=42.0,
        contribution=8.5,
        direction="INCREASES_DELAY",
        rank=1,
        source="TEST_SHAP",
    )

    assert factor.rank == 1

    assert (
        factor.direction
        == "INCREASES_DELAY"
    )


def test_explanation_can_be_unavailable():
    explanation = (
        PredictionExplanation()
    )

    assert (
        explanation
        .explanation_available
        is False
    )

    assert explanation.factors == []


def test_model_evaluation_schema():
    metrics = ModelEvaluationMetrics(
        model_name="Model2",
        mae_minutes=6.4,
        rmse_minutes=9.8,
        evaluation_split="test",
        sample_count=1000,
        source="TEST_ONLY",
    )

    assert (
        metrics.mae_minutes
        == 6.4
    )


def test_diagnostics_can_be_empty():
    diagnostics = (
        ModelDiagnostics()
    )

    assert (
        diagnostics
        .prediction_explanation
        is None
    )

    assert (
        diagnostics.evaluation
        is None
    )