from app.inference.evaluation import (
    get_model2_evaluation,
)


def test_model2_evaluation_loads_final_handoff_metrics():
    result = get_model2_evaluation()

    assert result["model_name"] == "MODEL_2"
    assert result["evaluation_split"] == "test"
    assert result["sample_count"] == 117

    assert result["mae_minutes"] > 0
    assert result["rmse_minutes"] > 0
    assert (
        result[
            "median_absolute_error_minutes"
        ]
        > 0
    )
    assert (
        result[
            "p90_absolute_error_minutes"
        ]
        > 0
    )

    assert (
        result["source"]
        == "FINAL_ML_HANDOFF_IMMEDIATE_NEXT_STATION"
    )


from app.inference.evaluation import (
    get_model1_evaluation,
    get_model2_evaluation,
)


def test_model1_evaluation_loads_final_handoff_metrics():
    result = get_model1_evaluation()

    assert result["model_name"] == "MODEL_1"
    assert (
        result["evaluation_split"]
        == "saved_2024_test_predictions"
    )
    assert result["sample_count"] == 214247

    assert result["mae_minutes"] > 0
    assert result["rmse_minutes"] > 0
    assert (
        result[
            "median_absolute_error_minutes"
        ]
        > 0
    )
    assert (
        result[
            "p90_absolute_error_minutes"
        ]
        > 0
    )

    assert (
        result["source"]
        == "FINAL_ML_HANDOFF_MODEL1_TEST"
    )


from app.inference.evaluation import (
    get_model1_evaluation,
    get_model2_evaluation,
    get_model3_evaluation,
)


def test_model3_evaluation_loads_final_handoff_metrics():
    result = get_model3_evaluation()

    assert result["model_name"] == "MODEL_3"
    assert result["evaluation_split"] == "test"
    assert result["sample_count"] == 1362

    assert result["mae_minutes"] > 0
    assert result["rmse_minutes"] > 0
    assert (
        result[
            "median_absolute_error_minutes"
        ]
        > 0
    )
    assert (
        result[
            "p90_absolute_error_minutes"
        ]
        > 0
    )

    assert (
        result["source"]
        == "FINAL_ML_HANDOFF_MODEL3_REPLAY"
    )

from app.inference.evaluation import (
    get_live_evaluation,
    get_model1_evaluation,
    get_model2_evaluation,
    get_model3_evaluation,
)

def test_live_evaluation_routes_by_station_horizon():
    model2_result = get_live_evaluation(
        [
            {
                "station": {
                    "stations_ahead": 1,
                }
            }
        ]
    )

    assert model2_result is not None
    assert model2_result["model_name"] == "MODEL_2"

    model3_result = get_live_evaluation(
        [
            {
                "station": {
                    "stations_ahead": 3,
                }
            }
        ]
    )

    assert model3_result is not None
    assert model3_result["model_name"] == "MODEL_3"