import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_demo_endpoint_contract(client):
    response = client.get("/v1/demo")

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True

    predictions = body["predictions"]

    assert isinstance(predictions, list)
    assert len(predictions) == 25

    assert (
        predictions[0]["model"]["prediction_engine"]
        == "MODEL_2_NEXT_STATION"
    )

    assert (
        predictions[1]["model"]["prediction_engine"]
        == "MODEL_3_MULTI_HORIZON"
    )