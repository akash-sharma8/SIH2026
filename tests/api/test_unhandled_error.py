from unittest.mock import patch

from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from app.main import app


def test_unhandled_exception_returns_safe_500():
    with TestClient(
        app,
        raise_server_exceptions=False,
    ) as client:
        with patch(
            "app.api.live_forecast."
            "LiveForecastService."
            "get_live_forecast",
            side_effect=RuntimeError(
                "SECRET_INTERNAL_FAILURE"
            ),
        ):
            response = client.post(
                "/v1/forecast/live",
                json={
                    "train_number": "12615"
                },
                headers={
                    "X-Request-ID":
                        "safe-500-test"
                },
            )

    assert response.status_code == 500

    body = response.json()

    assert body["success"] is False

    assert (
        body["error"]["code"]
        == "INTERNAL_SERVER_ERROR"
    )

    assert (
        body["request_id"]
        == "safe-500-test"
    )

    assert (
        "SECRET_INTERNAL_FAILURE"
        not in response.text
    )

    assert (
        response.headers["X-Request-ID"]
        == "safe-500-test"
    )

    