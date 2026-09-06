from fastapi.testclient import TestClient

from app.main import app


def test_live_forecast_cors_preflight():
    with TestClient(app) as client:
        response = client.options(
            "/v1/forecast/live",
            headers={
                "Origin":
                    "http://localhost:3000",
                "Access-Control-Request-Method":
                    "POST",
                "Access-Control-Request-Headers":
                    "content-type,x-request-id",
            },
        )

    assert response.status_code == 200

    assert (
        response.headers.get(
            "access-control-allow-origin"
        )
        == "http://localhost:3000"
    )

    allowed_methods = (
        response.headers.get(
            "access-control-allow-methods",
            "",
        )
    )

    assert "POST" in allowed_methods

    allowed_headers = (
        response.headers.get(
            "access-control-allow-headers",
            "",
        ).lower()
    )

    assert "content-type" in allowed_headers
    assert "x-request-id" in allowed_headers

    assert response.headers.get(
        "x-request-id"
    )