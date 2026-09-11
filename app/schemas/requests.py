from datetime import date
from typing import Optional

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)
class TrainInfo(BaseModel):
    train_number: str
    train_type: str


class ScheduleInfo(BaseModel):
    year: int = Field(ge=2000, le=2100)
    month: int = Field(ge=1, le=12)
    day_of_week: int = Field(ge=0, le=6)
    departure_hour: int = Field(ge=0, le=23)

    is_weekend: int = Field(ge=0, le=1)
    is_night_departure: int = Field(ge=0, le=1)
    is_peak_hour: int = Field(ge=0, le=1)
    is_festival_season: int = Field(ge=0, le=1)

    season: str


class RouteInfo(BaseModel):
    zone: str
    zone_abbr: str

    source_station_category: str
    destination_station_category: str

    distance_km: float = Field(gt=0)
    num_scheduled_stops: int = Field(ge=0)
    scheduled_travel_hours: float = Field(gt=0)

    route_historical_ontime_pct: float = Field(
        ge=0,
        le=100,
    )


class InfrastructureInfo(BaseModel):
    track_doubled: int = Field(ge=0, le=1)
    is_hdn_route: int = Field(ge=0, le=1)

    traction_type: str

    is_electrified: int = Field(ge=0, le=1)
    psr_count: int = Field(ge=0)

    is_circular_route: int = Field(ge=0, le=1)


class WeatherRiskInfo(BaseModel):
    is_monsoon_season: int = Field(ge=0, le=1)
    is_fog_risk: int = Field(ge=0, le=1)

    fog_risk_score: float
    zone_fog_index: float
    zone_congestion_index: float
    season_severity_score: float


class OperationsInfo(BaseModel):
    loco_age_years: float = Field(ge=0)
    coach_age_years: float = Field(ge=0)

    has_lhb_coaches: int = Field(ge=0, le=1)
    is_rake_shared: int = Field(ge=0, le=1)

    maintenance_score: float
    seat_utilisation_pct: float = Field(
        ge=0,
        le=100,
    )

    is_overloaded: int = Field(ge=0, le=1)

    late_incoming_rake: int = Field(
        ge=0,
        le=1,
    )

    is_special_train: int = Field(
        ge=0,
        le=1,
    )


class PredepartureForecastRequest(BaseModel):
    train: TrainInfo
    schedule: ScheduleInfo
    route: RouteInfo
    infrastructure: InfrastructureInfo
    weather_risk: WeatherRiskInfo
    operations: OperationsInfo

    def to_model1_features(self) -> dict:
        features = {}

        for section in (
            self.train,
            self.schedule,
            self.route,
            self.infrastructure,
            self.weather_risk,
            self.operations,
        ):
            features.update(
                section.model_dump()
            )

        return features


class SimplePredepartureForecastRequest(BaseModel):
    train_number: str = Field(
        ...,
        min_length=1,
        max_length=10,
        examples=["12722"],
    )

    journey_date: date = Field(
        ...,
        examples=["2026-09-11"],
    )

    @field_validator("train_number")
    @classmethod
    def validate_train_number(
        cls,
        value: str,
    ) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "Train number is required."
            )

        if not value.isdigit():
            raise ValueError(
                "Train number must contain digits only."
            )

        return value



from datetime import date

from pydantic import BaseModel, Field, field_validator


class LiveForecastRequest(BaseModel):
    train_number: str = Field(
        ...,
        min_length=1,
        max_length=10,
        examples=["12615"],
    )

    journey_date: date | None = Field(
        default=None,
        examples=["2026-09-01"],
    )

    @field_validator("train_number")
    @classmethod
    def validate_train_number(
        cls,
        value: str,
    ) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "Train number is required."
            )

        if not value.isdigit():
            raise ValueError(
                "Train number must contain "
                "digits only."
            )

        return value

    def journey_date_string(
        self,
    ) -> str | None:
        if self.journey_date is None:
            return None

        return self.journey_date.isoformat()
