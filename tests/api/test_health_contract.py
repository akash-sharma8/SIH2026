from fastapi.testclient import TestClient

from app.main import app


def test_health_contract():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200

    body = response.json()

    assert body == {
        "status": "healthy",
        "version": "1.0.0-prototype",
    }


def test_ready_contract():
    with TestClient(app) as client:
        response = client.get("/ready")

    assert response.status_code == 200

    body = response.json()

    assert body["status"] == "ready"
    assert (
        body["version"]
        == "1.0.0-prototype"
    )

    assert body["artifacts"] == {
        "model1": True,
        "model2": True,
        "model3": True,
        "configs": True,
    }

    assert (
        body["demo_available"]
        is True
    )


def test_health_and_ready_expose_request_id():
    with TestClient(app) as client:
        health = client.get(
            "/health",
            headers={
                "X-Request-ID":
                    "health-contract-test"
            },
        )

        ready = client.get(
            "/ready",
            headers={
                "X-Request-ID":
                    "ready-contract-test"
            },
        )

    assert (
        health.headers["X-Request-ID"]
        == "health-contract-test"
    )

    assert (
        ready.headers["X-Request-ID"]
        == "ready-contract-test"
    )


def test_ready_returns_503_when_artifacts_missing():
    with TestClient(app) as client:
        original_artifacts = client.app.state.artifacts

        try:
            client.app.state.artifacts = None

            response = client.get(
                "/ready"
            )

        finally:
            client.app.state.artifacts = (
                original_artifacts
            )

    assert response.status_code == 503

    body = response.json()

    assert body["status"] == "not_ready"

    assert body["artifacts"] == {
        "model1": False,
        "model2": False,
        "model3": False,
        "configs": False,
    }