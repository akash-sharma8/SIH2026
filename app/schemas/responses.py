from typing import Any

from pydantic import BaseModel, Field
from app.schemas.route import RouteMap
from app.schemas.weather import StationWeather
from app.schemas.weather_forecast import (
    StationWeatherAtETA,
)
from app.schemas.model_diagnostics import (
    ModelDiagnostics,
)

from app.schemas.disruption import (
    TrainDisruptionAlert,
)

class ErrorDetail(BaseModel):
    code: str
    message: str
    retryable: bool
    details: dict[str, Any] | None = None


class ApplicationErrorResponse(BaseModel):
    success: bool
    error: ErrorDetail
    request_id: str | None = None


class PredepartureModelInfo(BaseModel):
    name: str
    role: str
    version: str


class PredepartureForecast(BaseModel):
    predicted_destination_delay_min: float
    lower_delay_min: float
    upper_delay_min: float
    interval_radius_min: float
    risk_level: str
    confidence: str


class PredepartureInputQuality(BaseModel):
    feature_completeness_pct: float
    missing_features: list[str]
    missing_critical_features: list[str]
    unknown_categories: dict[str, Any]

class PredepartureJourneyInfo(BaseModel):
    train_number: str
    train_name: str | None = None
    train_type: str | None = None
    train_category: str | None = None
    journey_status: str
    year: int
    month: int
    day_of_week: int
    departure_hour: int

    is_weekend: int
    is_night_departure: int
    is_peak_hour: int

    season: str

    distance_km: float
    num_scheduled_stops: int
    scheduled_travel_hours: float

class PredepartureForecastResponse(BaseModel):
    success: bool
    model: PredepartureModelInfo
    forecast: PredepartureForecast
    journey: PredepartureJourneyInfo
    input_quality: PredepartureInputQuality
    limitations: list[str]
    diagnostics: ModelDiagnostics | None = None


class StationInfo(BaseModel):
    code: str
    name: str
    stations_ahead: int
    distance_km: float


class ScheduleInfoResponse(BaseModel):
    arrival: str | None = None


class StationForecast(BaseModel):
    eta: str | None
    predicted_delay_min: float
    delay_status: str
    lower_eta: str | None
    upper_eta: str | None
    interval_radius_min: float
    confidence: str


class PredictionModelInfo(BaseModel):
    prediction_engine: str
    model2_prediction_min: float | None
    model3_prediction_min: float | None
    recent_delay_baseline_min: float | None
    fallback_used: bool
    fallback_reason: str | None


class ProviderComparison(BaseModel):
    provider_eta: str | None
    provider_delay_min: float | None


class StationPrediction(BaseModel):
    station: StationInfo
    schedule: ScheduleInfoResponse
    forecast: StationForecast
    model: PredictionModelInfo
    explanation: str
    comparison_only: ProviderComparison

class JourneyTimelineStation(BaseModel):
    station_code: str | None = None
    station_name: str | None = None

    status: str

    scheduled_arrival: str | None = None
    scheduled_departure: str | None = None

    actual_arrival: str | None = None
    actual_departure: str | None = None

    predicted_arrival: str | None = None
    predicted_departure: str | None = None

    delay_min: float | None = None
    platform: str | None = None
    distance_from_source_km: float | None = None


class JourneyEndpoint(BaseModel):
    station_code: str | None = None
    station_name: str | None = None
    scheduled_arrival: str | None = None
    scheduled_departure: str | None = None


class JourneyTimeline(BaseModel):
    state: str
    stations: list[JourneyTimelineStation] = Field(
        default_factory=list
    )


class JourneyInfo(BaseModel):
    journey_id: str
    train_number: str
    train_name: str | None

    journey_start_date: str | None = None

    source: JourneyEndpoint | None = None
    destination: JourneyEndpoint | None = None

    current_station_code: str | None
    current_station_name: str | None
    current_observed_arrival: str | None
    current_delay_min: float | None

    observed_stations: int
    upcoming_stations: int
    state_source: str

    timeline: JourneyTimeline | None = None

class SystemArchitecture(BaseModel):
    next_station: str
    later_stations: str
    provider_forecast_usage: str


class SystemInfo(BaseModel):
    name: str
    architecture: SystemArchitecture
    leakage_safe: bool


class BackendMetadata(BaseModel):
    provider_payload_cache: str
    cache_ttl_seconds: int


class LiveForecastResponse(BaseModel):
    success: bool
    message: str | None = None
    system: SystemInfo
    journey: JourneyInfo
    predictions: list[StationPrediction]
    backend: BackendMetadata | None = None
    route: RouteMap | None = None

    eta_weather_corridor: list[StationWeatherAtETA] = Field(
        default_factory=list
    )
    diagnostics: ModelDiagnostics | None = None
    alerts: list[
        TrainDisruptionAlert
    ] = Field(
        default_factory=list
    )
    weather_corridor: list[StationWeather] = Field(
        default_factory=list
    )


class HealthResponse(BaseModel):
    status: str
    version: str


class ReadinessArtifacts(BaseModel):
    model1: bool
    model2: bool
    model3: bool
    configs: bool


class ReadyResponse(BaseModel):
    status: str
    version: str
    artifacts: ReadinessArtifacts
    demo_available: bool
