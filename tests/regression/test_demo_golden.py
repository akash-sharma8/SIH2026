import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app


PROJECT_ROOT = Path(__file__).resolve().parents[2]

GOLDEN_PATH = (
    PROJECT_ROOT
    / "tests"
    / "fixtures"
    / "saved_journey_12615_expected.json"
)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_demo_matches_golden_reference(client):
    response = client.get("/v1/demo")

    assert response.status_code == 200

    actual = response.json()

    with GOLDEN_PATH.open("r", encoding="utf-8") as file:
        expected = json.load(file)

    assert actual["success"] is True
    assert expected["success"] is True

    assert len(actual["predictions"]) == len(expected["predictions"])

    for actual_prediction, expected_prediction in zip(
        actual["predictions"],
        expected["predictions"],
    ):
        assert (
            actual_prediction["station"]["code"]
            == expected_prediction["station"]["code"]
        )

        assert (
            actual_prediction["model"]["prediction_engine"]
            == expected_prediction["model"]["prediction_engine"]
        )

        assert actual_prediction["forecast"]["predicted_delay_min"] == pytest.approx(
            expected_prediction["forecast"]["predicted_delay_min"],
            abs=0.1,
        )