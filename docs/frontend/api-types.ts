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

export interface JourneyInfo {
  journey_id: string;
  train_number: string;
  train_name: string | null;

  current_station_code: string | null;
  current_station_name: string | null;
  current_observed_arrival: string | null;
  current_delay_min: number | null;

  observed_stations: number;
  upcoming_stations: number;
  state_source: string;
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
  system: SystemInfo;
  journey: JourneyInfo;
  predictions: StationPrediction[];
  backend?: BackendMetadata | null;
}

export interface PredepartureForecastRequest {
  train: {
    train_number: string;
    train_type: string;
  };

  schedule: {
    year: number;
    month: number;
    day_of_week: number;
    departure_hour: number;

    is_weekend: 0 | 1;
    is_night_departure: 0 | 1;
    is_peak_hour: 0 | 1;
    is_festival_season: 0 | 1;

    season: string;
  };

  route: {
    zone: string;
    zone_abbr: string;

    source_station_category: string;
    destination_station_category: string;

    distance_km: number;
    num_scheduled_stops: number;
    scheduled_travel_hours: number;
    route_historical_ontime_pct: number;
  };

  infrastructure: {
    track_doubled: 0 | 1;
    is_hdn_route: 0 | 1;
    traction_type: string;
    is_electrified: 0 | 1;
    psr_count: number;
    is_circular_route: 0 | 1;
  };

  weather_risk: {
    is_monsoon_season: 0 | 1;
    is_fog_risk: 0 | 1;
    fog_risk_score: number;
    zone_fog_index: number;
    zone_congestion_index: number;
    season_severity_score: number;
  };

  operations: {
    loco_age_years: number;
    coach_age_years: number;
    has_lhb_coaches: 0 | 1;
    is_rake_shared: 0 | 1;
    maintenance_score: number;
    seat_utilisation_pct: number;
    is_overloaded: 0 | 1;
    late_incoming_rake: 0 | 1;
    is_special_train: 0 | 1;
  };
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
  input_quality: PredepartureInputQuality;
  limitations: string[];
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