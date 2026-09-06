from pathlib import Path
import json
from typing import Any

from app.inference.hybrid import predict_hybrid_station_etas
from app.inference.model3 import (
    predict_upcoming_station_etas,
    extract_model3_prediction_result,
)
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


class InferenceAdapter:
    def __init__(self, artifacts: Any) -> None:
        self.artifacts = artifacts

    def run_payload(
        self,
        api_result: dict[str, Any],
    ) -> dict[str, Any]:
        normalized_df = normalize_live_journey(
            api_result
        )

        def model3_predictor(df):
            return predict_upcoming_station_etas(
                normalized_journey_df=df,
                model=self.artifacts.model3,
                model3_config=
                    self.artifacts.model3_config,
            )

        def hybrid_predictor(df):
            return predict_hybrid_station_etas(
                normalized_journey_df=df,

                model2=
                    self.artifacts.model2,

                model2_feature_order=
                    self.artifacts.model2_metadata[
                        "features"
                    ],

                model2_categorical_features=
                    self.artifacts.model2_metadata[
                        "categorical_features"
                    ],

                model3_predictor=
                    model3_predictor,

                model3_result_extractor=
                    extract_model3_prediction_result,

                next_station_interval_radius_min=
                    float(
                        self.artifacts.fusion_config[
                            "next_station_interval_radius_min"
                        ]
                    ),
            )

        return build_hybrid_eta_service_response(
            normalized_journey_df=normalized_df,

            hybrid_predictor=
                hybrid_predictor,

            model2=
                self.artifacts.model2,

            model2_feature_order=
                self.artifacts.model2_metadata[
                    "features"
                ],

            model2_categorical_features=
                self.artifacts.model2_metadata[
                    "categorical_features"
                ],
        )

    def run_saved_demo(self) -> dict[str, Any]:
        if not DEMO_PATH.is_file():
            raise FileNotFoundError(
                f"Saved demo payload not found: {DEMO_PATH}"
            )

        with DEMO_PATH.open(
            "r",
            encoding="utf-8",
        ) as file:
            api_result = json.load(file)

        return self.run_payload(
            api_result
        )