import pandas as pd

from app.inference.artifacts import load_artifacts
from app.inference.model1 import (
    predict_model1_predeparture,
)
from tests.regression.legacy_runtime import (
    ml_runtime,
)


def test_new_model1_matches_runtime():
    artifacts = load_artifacts()

    metadata = artifacts.model1_metadata

    features = {
        feature: None
        for feature
        in metadata["model"]["features"]
    }

    # Use known-valid categories directly from metadata.
    for categorical_feature in (
        metadata["model"][
            "categorical_features"
        ]
    ):
        features[
            categorical_feature
        ] = (
            metadata["model"][
                "category_mappings"
            ][categorical_feature][0]
        )

    # Deterministic numeric values.
    numeric_defaults = {
        "year": 2024,
        "month": 8,
        "day_of_week": 2,
        "departure_hour": 10,
        "is_weekend": 0,
        "is_night_departure": 0,
        "is_peak_hour": 0,
        "is_festival_season": 0,
        "distance_km": 500.0,
        "num_scheduled_stops": 10,
        "scheduled_travel_hours": 8.0,
        "track_doubled": 1,
        "is_hdn_route": 0,
        "is_electrified": 1,
        "psr_count": 1,
        "is_circular_route": 0,
        "is_monsoon_season": 1,
        "is_fog_risk": 0,
        "fog_risk_score": 0.1,
        "zone_fog_index": 0.2,
        "zone_congestion_index": 0.3,
        "season_severity_score": 0.4,
        "loco_age_years": 5.0,
        "coach_age_years": 4.0,
        "has_lhb_coaches": 1,
        "is_rake_shared": 0,
        "maintenance_score": 85.0,
        "seat_utilisation_pct": 80.0,
        "is_overloaded": 0,
        "late_incoming_rake": 0,
        "is_special_train": 0,
        "route_historical_ontime_pct": 75.0,
    }

    features.update(
        numeric_defaults
    )

    expected = (
        ml_runtime.predict_model1_predeparture(
            features,
            strict=True,
        )
    )

    actual = (
        predict_model1_predeparture(
            features,
            model=artifacts.model1,
            metadata=metadata,
            strict=True,
        )
    )

    assert actual == expected