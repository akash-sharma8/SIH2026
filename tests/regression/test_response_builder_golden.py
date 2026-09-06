import json
from pathlib import Path

from tests.regression.legacy_runtime import ml_runtime
from app.inference.artifacts import load_artifacts
from app.inference.hybrid import predict_hybrid_station_etas
from app.inference.model3 import predict_upcoming_station_etas
from app.inference.normalizer import normalize_live_journey
from app.inference.response_builder import (
    build_hybrid_eta_service_response,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEMO_PATH = (
    PROJECT_ROOT
    / "ml_handoff"
    / "raileta_space"
    / "demo"
    / "saved_journey_12615.json"
)


def test_new_response_builder_matches_runtime():
    with DEMO_PATH.open("r", encoding="utf-8") as file:
        api_result = json.load(file)

    normalized_df = normalize_live_journey(
        api_result,
        collected_at="2026-09-01T00:00:00+00:00",
    )

    artifacts = load_artifacts()

    expected = (
        ml_runtime.build_hybrid_eta_service_response(
            normalized_df
        )
    )

    def new_hybrid_predictor(df):
        return predict_hybrid_station_etas(
            normalized_journey_df=df,
            model2=artifacts.model2,
            model2_feature_order=
                artifacts.model2_metadata["features"],
            model2_categorical_features=
                artifacts.model2_metadata[
                    "categorical_features"
                ],
            model3_predictor=lambda model3_df: (
                predict_upcoming_station_etas(
                    normalized_journey_df=model3_df,
                    model=artifacts.model3,
                    model3_config=
                        artifacts.model3_config,
                )
            ),
            model3_result_extractor=
                ml_runtime.extract_model3_prediction_result,
            next_station_interval_radius_min=
                float(
                    artifacts.fusion_config[
                        "next_station_interval_radius_min"
                    ]
                ),
        )

    actual = build_hybrid_eta_service_response(
        normalized_journey_df=normalized_df,
        hybrid_predictor=new_hybrid_predictor,
        model2=artifacts.model2,
        model2_feature_order=
            artifacts.model2_metadata["features"],
        model2_categorical_features=
            artifacts.model2_metadata[
                "categorical_features"
            ],
    )

    assert actual == expected



def test_response_builder_handles_no_upcoming_stations():
    with DEMO_PATH.open("r", encoding="utf-8") as file:
        api_result = json.load(file)

    normalized_df = normalize_live_journey(
        api_result,
        collected_at="2026-09-01T00:00:00+00:00",
    )

    artifacts = load_artifacts()

    empty_predictions = normalized_df.iloc[0:0].copy()

    def empty_hybrid_predictor(_df):
        return empty_predictions

    actual = build_hybrid_eta_service_response(
        normalized_journey_df=normalized_df,
        hybrid_predictor=empty_hybrid_predictor,
        model2=artifacts.model2,
        model2_feature_order=
            artifacts.model2_metadata["features"],
        model2_categorical_features=
            artifacts.model2_metadata[
                "categorical_features"
            ],
    )

    assert actual["success"] is True
    assert actual["system"] is not None
    assert actual["journey"] is not None
    assert actual["journey"]["train_number"] == "12615"
    assert actual["journey"]["upcoming_stations"] == 25
    assert actual["predictions"] == []



def test_completed_journey_bypasses_models():
    with DEMO_PATH.open("r", encoding="utf-8") as file:
        api_result = json.load(file)

    normalized_df = normalize_live_journey(
        api_result,
        collected_at="2026-09-01T00:00:00+00:00",
    )

    # Simulate a completed journey:
    # no station remains upcoming.
    normalized_df[
        "station_status_normalized"
    ] = "departed"

    normalized_df.loc[
        normalized_df.index[-1],
        "station_status_normalized",
    ] = "at-station"

    normalized_df[
        "station_status"
    ] = normalized_df[
        "station_status_normalized"
    ]

    normalized_df[
        "arrival_is_observed"
    ] = False

    artifacts = load_artifacts()

    def should_not_run(_df):
        raise AssertionError(
            "Hybrid inference must not run "
            "for a completed journey."
        )

    actual = build_hybrid_eta_service_response(
        normalized_journey_df=normalized_df,
        hybrid_predictor=should_not_run,
        model2=artifacts.model2,
        model2_feature_order=
            artifacts.model2_metadata["features"],
        model2_categorical_features=
            artifacts.model2_metadata[
                "categorical_features"
            ],
    )

    assert actual["success"] is True
    assert actual["predictions"] == []

    assert (
        actual["journey"]["upcoming_stations"]
        == 0
    )

    assert (
        actual["journey"]["state_source"]
        ==
        "NORMALIZED_LIVE_JOURNEY_NO_UPCOMING_STATIONS"
    )


def test_insufficient_verified_observations_bypasses_models():
    with DEMO_PATH.open("r", encoding="utf-8") as file:
        api_result = json.load(file)

    normalized_df = normalize_live_journey(
        api_result,
        collected_at="2026-09-01T00:00:00+00:00",
    )

    # Simulate a running/provider journey where
    # upcoming stations exist but none of the
    # previous arrivals can be safely verified.
    normalized_df[
        "arrival_is_observed"
    ] = False

    assert (
        normalized_df[
            "station_status_normalized"
        ]
        .eq("upcoming")
        .any()
    )

    artifacts = load_artifacts()

    def should_not_run(_df):
        raise AssertionError(
            "Hybrid inference must not run "
            "without verified observations."
        )

    actual = build_hybrid_eta_service_response(
        normalized_journey_df=normalized_df,
        hybrid_predictor=should_not_run,
        model2=artifacts.model2,
        model2_feature_order=
            artifacts.model2_metadata["features"],
        model2_categorical_features=
            artifacts.model2_metadata[
                "categorical_features"
            ],
    )

    assert actual["success"] is True
    assert actual["predictions"] == []

    assert (
        actual["journey"]["upcoming_stations"]
        > 0
    )

    assert (
        actual["journey"]["observed_stations"]
        == 0
    )

    assert (
        actual["journey"]["state_source"]
        ==
        "INSUFFICIENT_VERIFIED_OBSERVATIONS"
    )