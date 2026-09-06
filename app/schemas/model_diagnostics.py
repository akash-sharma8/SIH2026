from typing import Literal

from pydantic import BaseModel, Field


class PredictionFactor(BaseModel):
    feature: str
    display_name: str | None = None

    value: float | str | None = None

    contribution: float | None = None

    direction: Literal[
        "INCREASES_DELAY",
        "REDUCES_DELAY",
        "NEUTRAL",
        "UNKNOWN",
    ] = "UNKNOWN"

    rank: int | None = None

    source: str


class PredictionExplanation(BaseModel):
    method: Literal[
        "SHAP",
        "FEATURE_IMPORTANCE",
        "MODEL_NATIVE",
        "UNAVAILABLE",
    ] = "UNAVAILABLE"

    factors: list[
        PredictionFactor
    ] = Field(default_factory=list)

    explanation_available: bool = False

    source: str | None = None

    served_prediction_min: float | None = None

    external_baseline_min: float | None = None

    stations_ahead: int | None = None

    current_station_code: str | None = None

    target_station_code: str | None = None
    causal: bool | None = None
    interpretation: str | None = None

class ModelEvaluationMetrics(BaseModel):
    model_name: str

    mae_minutes: float | None = None
    rmse_minutes: float | None = None
    median_absolute_error_minutes: (
        float | None
    ) = None
    p90_absolute_error_minutes: (
        float | None
    ) = None

    evaluation_split: str | None = None
    sample_count: int | None = None

    source: str


class ModelDiagnostics(BaseModel):
    prediction_explanation: (
        PredictionExplanation | None
    ) = None

    evaluation: (
        ModelEvaluationMetrics | None
    ) = None