export type DelayStatus =
  | "ON_TIME"
  | "LATE"
  | "EARLY"
  | string;

export type ForecastConfidence =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | string;

export interface ErrorDetail {
  code: string;
  message: string;
  retryable: boolean;
  details: Record<string, unknown> | null;
}

export interface ApplicationErrorResponse {
  success: false;
  error: ErrorDetail;
  request_id: string | null;
}

export interface ValidationErrorItem {
  type: string;
  loc: Array<string | number>;
  msg: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface ValidationErrorResponse {
  detail: ValidationErrorItem[];
}

export interface LiveForecastRequest {
  train_number: string;
  journey_date?: string | null;
}

export interface StationInfo {
  code: string;
  name: string;
  stations_ahead: number;
  distance_km: number;
}

export interface ScheduleInfo {
  arrival: string | null;
}

export interface StationForecast {
  eta: string | null;
  predicted_delay_min: number;
  delay_status: DelayStatus;
  lower_eta: string | null;
  upper_eta: string | null;
  interval_radius_min: number;
  confidence: ForecastConfidence;
}

export interface PredictionModelInfo {
  prediction_engine: string;
  model2_prediction_min: number | null;
  model3_prediction_min: number | null;
  recent_delay_baseline_min: number | null;
  fallback_used: boolean;
  fallback_reason: string | null;
}

export interface ProviderComparison {
  provider_eta: string | null;
  provider_delay_min: number | null;
}

export interface StationPrediction {
  station: StationInfo;
  schedule: ScheduleInfo;
  forecast: StationForecast;
  model: PredictionModelInfo;
  explanation: string;
  comparison_only: ProviderComparison;
}

export interface ScheduledJourneyStation {
  station_code: string | null;
  station_name: string | null;
  scheduled_arrival: string | null;
  scheduled_departure: string | null;
  platform: string | null;
  distance_from_source_km: number | null;
}

export interface ScheduledJourneyEndpoint {
  station_code: string | null;
  station_name: string | null;
  scheduled_departure?: string | null;
  scheduled_arrival?: string | null;
}
export type JourneyTimelineStatus =
  | "PASSED"
  | "CURRENT"
  | "NEXT"
  | "UPCOMING"
  | "DESTINATION"
  | "SCHEDULED"
  | string;

export interface JourneyTimelineStation {
  station_code: string | null;
  station_name: string | null;

  status: JourneyTimelineStatus;

  scheduled_arrival: string | null;
  scheduled_departure: string | null;

  actual_arrival: string | null;
  actual_departure: string | null;

  predicted_arrival: string | null;
  predicted_departure: string | null;

  delay_min: number | null;
  platform: string | null;
  distance_from_source_km: number | null;
}

export interface JourneyTimeline {
  state:
    | "RUNNING"
    | "SCHEDULED_NOT_STARTED"
    | "COMPLETED"
    | string;

  stations: JourneyTimelineStation[];
}
export type JourneyStateSource =
  | "SCHEDULED_NOT_STARTED"
  | "NORMALIZED_LIVE_JOURNEY_NO_UPCOMING_STATIONS"
  | "INSUFFICIENT_VERIFIED_OBSERVATIONS"
  | string;

export interface JourneyInfo {
  journey_id: string;
  train_number: string;
  train_name: string | null;

  journey_start_date?: string | null;

  source?: ScheduledJourneyEndpoint | null;
  destination?: ScheduledJourneyEndpoint | null;
  schedule?: ScheduledJourneyStation[];
  timeline?: JourneyTimeline | null;

  current_station_code: string | null;
  current_station_name: string | null;
  current_observed_arrival: string | null;
  current_delay_min: number | null;

  observed_stations: number;
  upcoming_stations: number;
  state_source: JourneyStateSource;
}
export interface SystemArchitecture {
  next_station: string;
  later_stations: string;
  provider_forecast_usage: string;
}

export interface SystemInfo {
  name: string;
  architecture: SystemArchitecture;
  leakage_safe: boolean;
}

export interface BackendMetadata {
  provider_payload_cache: "HIT" | "MISS" | string;
  cache_ttl_seconds: number;
}

export interface LiveForecastResponse {
  success: true;
  message?: string | null;
  system: SystemInfo;
  journey: JourneyInfo;
  predictions: StationPrediction[];
  backend?: BackendMetadata | null;
  route: RouteMapData | null;
  weather_corridor: StationWeather[];
  eta_weather_corridor: StationWeatherAtETA[];
  diagnostics: ModelDiagnostics | null;
  alerts: TrainDisruptionAlert[];
}

export interface PredepartureForecastRequest {
  train_number: string;
  journey_date: string;
}

export interface PredepartureModelInfo {
  name: string;
  role: string;
  version: string;
}

export interface PredepartureForecast {
  predicted_destination_delay_min: number;
  lower_delay_min: number;
  upper_delay_min: number;
  interval_radius_min: number;
  risk_level:
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "SEVERE"
  | string;
  confidence:
  | "LOW"
  | "MEDIUM"
  | string;
}

export interface PredepartureJourneyInfo {
  train_number: string;
  train_name: string | null;
  train_type: string | null;
  train_category: string | null;
  journey_status: string;
  year: number;
  month: number;
  day_of_week: number;
  departure_hour: number;

  is_weekend: number;
  is_night_departure: number;
  is_peak_hour: number;

  season: string;

  distance_km: number;
  num_scheduled_stops: number;
  scheduled_travel_hours: number;
}

export interface PredepartureInputQuality {
  feature_completeness_pct: number;
  missing_features: string[];
  missing_critical_features: string[];
  unknown_categories: Record<string, unknown>;
}

export interface PredepartureForecastResponse {
  success: true;
  model: PredepartureModelInfo;
  forecast: PredepartureForecast;
  journey: PredepartureJourneyInfo;
  input_quality: PredepartureInputQuality;
  limitations: string[];
  diagnostics: ModelDiagnostics | null;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export interface ReadinessArtifacts {
  model1: boolean;
  model2: boolean;
  model3: boolean;
  configs: boolean;
}

export interface ReadyResponse {
  status: "ready" | "not_ready";
  version: string;
  artifacts: ReadinessArtifacts;
  demo_available: boolean;
}


export type RouteStationStatus =
  | "PASSED"
  | "CURRENT"
  | "NEXT"
  | "UPCOMING"
  | "DESTINATION";

export interface RouteStation {
  code: string;
  name: string | null;
  latitude: number;
  longitude: number;
  status: RouteStationStatus;
  stations_ahead: number | null;
}

export type TrainPositionSource =
  | "REAL_PROVIDER_GPS"
  | "ESTIMATED_BETWEEN_STATIONS"
  | "CURRENT_STATION";

export interface TrainPosition {
  latitude: number;
  longitude: number;
  position_source: TrainPositionSource;
  accuracy_note: string | null;
}

export interface StationCoordinates {
  code: string;
  name: string | null;
  latitude: number;
  longitude: number;
  source: string;
}

export interface RouteMapData {
  source: StationCoordinates | null;
  destination: StationCoordinates | null;
  current_position: TrainPosition | null;
  stations: RouteStation[];
}



export type WeatherRiskLevel =
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "SEVERE"
  | "UNKNOWN";


export interface StationWeather {
  station_code: string;
  station_name: string | null;

  latitude: number;
  longitude: number;

  temperature_c: number | null;
  condition: string | null;

  precipitation_probability_pct:
  number | null;

  visibility_km: number | null;
  wind_kph: number | null;
  humidity_pct: number | null;

  risk_level: WeatherRiskLevel;

  source: string;
}


export interface StationWeatherAtETA {
  station_code: string;
  station_name: string | null;

  predicted_eta: string;

  forecast_time: string | null;

  weather: StationWeather | null;

  time_difference_minutes:
  number | null;

  source: string;
}

export type PredictionDirection =
  | "INCREASES_DELAY"
  | "REDUCES_DELAY"
  | "NEUTRAL"
  | "UNKNOWN";


export interface PredictionFactor {
  feature: string;
  display_name: string | null;

  value: number | string | null;

  contribution: number | null;

  direction: PredictionDirection;

  rank: number | null;

  source: string;
}


export interface PredictionExplanation {
  method:
  | "SHAP"
  | "FEATURE_IMPORTANCE"
  | "MODEL_NATIVE"
  | "UNAVAILABLE";

  factors: PredictionFactor[];

  explanation_available: boolean;
  served_prediction_min: number | null;
  external_baseline_min: number | null;

  stations_ahead: number | null;
  current_station_code: string | null;
  target_station_code: string | null;

  causal: boolean | null;
  interpretation: string | null;
}


export interface ModelEvaluationMetrics {
  model_name: string;

  mae_minutes: number | null;
  rmse_minutes: number | null;

  median_absolute_error_minutes:
  number | null;

  p90_absolute_error_minutes:
  number | null;

  evaluation_split: string | null;
  sample_count: number | null;

  source: string;
}


export interface ModelDiagnostics {
  prediction_explanation:
  PredictionExplanation | null;

  evaluation:
  ModelEvaluationMetrics | null;
}

export interface TrainSearchResult {
  train_number: string;
  train_name: string;

  source_code: string | null;
  source_name: string | null;

  destination_code: string | null;
  destination_name: string | null;

  train_type: string | null;
  popularity: number | null;
}

export interface TrainSearchResponse {
  success: true;
  results: TrainSearchResult[];
}

export interface DisruptionStation {
    code: string | null;
    name: string | null;
}

export interface TrainDisruptionAlert {
    type: string;
    severity: string;
    title: string;
    message: string;
    from_station: DisruptionStation | null;
    to_station: DisruptionStation | null;
    affected_stations: DisruptionStation[];
    source: string;
}