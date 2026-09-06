from __future__ import annotations

import csv
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]

FINAL_REPORT_ROOT = (
    PROJECT_ROOT
    / "artifacts"
    / "reports"
)


def _read_csv_rows(
    filename: str,
) -> list[dict[str, str]]:
    path = FINAL_REPORT_ROOT / filename

    if not path.is_file():
        raise FileNotFoundError(
            f"Evaluation report not found: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(
            csv.DictReader(file)
        )


def get_model2_evaluation() -> dict[str, Any]:
    rows = _read_csv_rows(
        "immediate_next_station_metrics.csv"
    )

    row = next(
        item
        for item in rows
        if (
            item["split"] == "test"
            and "Model 2" in item["model"]
        )
    )

    return {
        "model_name": "MODEL_2",
        "mae_minutes": float(
            row["mae_min"]
        ),
        "rmse_minutes": float(
            row["rmse_min"]
        ),
        "median_absolute_error_minutes": float(
            row["median_ae_min"]
        ),
        "p90_absolute_error_minutes": float(
            row["p90_ae_min"]
        ),
        "evaluation_split": "test",
        "sample_count": int(
            row["rows"]
        ),
        "source":
            "FINAL_ML_HANDOFF_IMMEDIATE_NEXT_STATION",
    }

def get_model1_evaluation() -> dict[str, Any]:
    rows = _read_csv_rows(
        "model1_final_test_metrics.csv"
    )

    if len(rows) != 1:
        raise ValueError(
            "Expected exactly one Model 1 evaluation row."
        )

    row = rows[0]

    return {
        "model_name": "MODEL_1",
        "mae_minutes": float(
            row["mae_min"]
        ),
        "rmse_minutes": float(
            row["rmse_min"]
        ),
        "median_absolute_error_minutes": float(
            row["median_ae_min"]
        ),
        "p90_absolute_error_minutes": float(
            row["p90_ae_min"]
        ),
        "evaluation_split":
            row["evaluation"],
        "sample_count": int(
            row["rows"]
        ),
        "source":
            "FINAL_ML_HANDOFF_MODEL1_TEST",
    }

def get_model3_evaluation() -> dict[str, Any]:
    rows = _read_csv_rows(
        "expanded_hybrid_replay_metrics.csv"
    )

    row = next(
        item
        for item in rows
        if (
            item["split"] == "test"
            and item["model"] == "Model 3"
        )
    )

    return {
        "model_name": "MODEL_3",
        "mae_minutes": float(
            row["mae_min"]
        ),
        "rmse_minutes": float(
            row["rmse_min"]
        ),
        "median_absolute_error_minutes": float(
            row["median_ae_min"]
        ),
        "p90_absolute_error_minutes": float(
            row["p90_ae_min"]
        ),
        "evaluation_split": "test",
        "sample_count": int(
            row["rows"]
        ),
        "source":
            "FINAL_ML_HANDOFF_MODEL3_REPLAY",
    }
def get_live_evaluation(
    predictions: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not predictions:
        return None

    first_prediction = predictions[0]

    station = first_prediction.get(
        "station",
        {}
    )

    stations_ahead = int(
        station.get(
            "stations_ahead",
            1,
        )
    )

    if stations_ahead == 1:
        return get_model2_evaluation()

    return get_model3_evaluation()