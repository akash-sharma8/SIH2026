from app.inference.artifacts import load_artifacts


def test_load_artifacts_contract():
    artifacts = load_artifacts()

    assert type(artifacts.model1).__name__ == "Booster"
    assert type(artifacts.model2).__name__ == "CatBoostRegressor"
    assert type(artifacts.model3).__name__ == "CatBoostRegressor"

    assert isinstance(artifacts.model1_metadata, dict)
    assert isinstance(artifacts.model2_metadata, dict)
    assert isinstance(artifacts.model3_config, dict)
    assert isinstance(artifacts.fusion_config, dict)
    assert isinstance(artifacts.hybrid_manifest, dict)
    assert isinstance(artifacts.system_manifest, dict)

    assert artifacts.fusion_config["weights"] == {
        "model2": 1.0,
        "model3": 0.0,
        "recent_delay_baseline": 0.0,
    }

    assert artifacts.model3_config["residual_alpha"] == 0.35

    required_system_keys = {
        "system",
        "operational_routing",
        "model_1",
        "model_2",
        "model_3",
        "leakage_controls",
    }

    assert required_system_keys.issubset(
        artifacts.system_manifest.keys()
    )