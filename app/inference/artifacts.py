from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any

import lightgbm as lgb
from catboost import CatBoostRegressor


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_ROOT = PROJECT_ROOT / "artifacts" / "models"
CONFIG_ROOT = PROJECT_ROOT / "artifacts" / "config"


@dataclass(frozen=True)
class ModelArtifacts:
    model1: Any
    model2: Any
    model3: Any
    model1_metadata: dict
    model2_metadata: dict
    model3_config: dict
    fusion_config: dict
    hybrid_manifest: dict
    system_manifest: dict


REQUIRED_MODEL_FILES = {
    "model1": "model1_predeparture_lightgbm.txt",
    "model2": "model2_station_eta_catboost.cbm",
    "model3": "model3_guarded_residual_catboost.cbm",
}

REQUIRED_CONFIG_FILES = {
    "model1_metadata": "model1_predeparture_metadata.json",
    "model2_metadata": "model2_station_eta_metadata.json",
    "model3_config": "model3_guarded_residual_config.json",
    "fusion_config": "next_station_fusion_config.json",
    "hybrid_manifest": "hybrid_eta_deployment_manifest.json",
    "system_manifest": "three_model_system_manifest.json",
}


def _require_file(path: Path) -> Path:
    if not path.is_file():
        raise FileNotFoundError(f"Required artifact not found: {path}")

    return path


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)

def _validate_configs(
    system_manifest: dict,
    fusion_config: dict,
    model3_config: dict,
) -> None:
    required_system_keys = {
        "system",
        "operational_routing",
        "model_1",
        "model_2",
        "model_3",
        "leakage_controls",
    }

    missing_keys = required_system_keys - system_manifest.keys()

    if missing_keys:
        raise ValueError(
            f"System manifest missing required keys: {sorted(missing_keys)}"
        )

    weights = fusion_config.get("weights")

    if not isinstance(weights, dict):
        raise ValueError("Fusion config is missing 'weights'.")

    expected_weights = {
        "model2": 1.0,
        "model3": 0.0,
        "recent_delay_baseline": 0.0,
    }

    if weights != expected_weights:
        raise ValueError(
            f"Unexpected fusion weights: {weights}"
        )

    residual_alpha = model3_config.get("residual_alpha")

    if residual_alpha != 0.35:
        raise ValueError(
            f"Unexpected Model 3 residual alpha: {residual_alpha}"
        )

def load_artifacts() -> ModelArtifacts:
    model_paths = {
        key: _require_file(MODEL_ROOT / filename)
        for key, filename in REQUIRED_MODEL_FILES.items()
    }

    config_paths = {
        key: _require_file(CONFIG_ROOT / filename)
        for key, filename in REQUIRED_CONFIG_FILES.items()
    }
    loaded_configs = {
        key: _load_json(path)
        for key, path in config_paths.items()
    }

    _validate_configs(
        system_manifest=loaded_configs["system_manifest"],
        fusion_config=loaded_configs["fusion_config"],
        model3_config=loaded_configs["model3_config"],
    )

    model1 = lgb.Booster(
        model_file=str(model_paths["model1"]),
    )

    model2 = CatBoostRegressor()
    model2.load_model(str(model_paths["model2"]))

    model3 = CatBoostRegressor()
    model3.load_model(str(model_paths["model3"]))

    return ModelArtifacts(
        model1=model1,
        model2=model2,
        model3=model3,
        model1_metadata=loaded_configs["model1_metadata"],
        model2_metadata=loaded_configs["model2_metadata"],
        model3_config=loaded_configs["model3_config"],
        fusion_config=loaded_configs["fusion_config"],
        hybrid_manifest=loaded_configs["hybrid_manifest"],
        system_manifest=loaded_configs["system_manifest"],
    )