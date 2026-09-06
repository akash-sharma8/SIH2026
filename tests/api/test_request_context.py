from fastapi.testclient import TestClient

from app.main import app


def test_request_id_is_generated():
    with TestClient(app) as client:
        response = client.get(
            "/health"
        )

    assert response.status_code == 200

    request_id = response.headers.get(
        "X-Request-ID"
    )

    assert request_id
    assert isinstance(
        request_id,
        str,
    )


def test_custom_request_id_is_preserved():
    with TestClient(app) as client:
        response = client.get(
            "/health",
            headers={
                "X-Request-ID":
                    "demo-request-123",
            },
        )

    assert response.status_code == 200

    assert (
        response.headers.get(
            "X-Request-ID"
        )
        == "demo-request-123"
    )