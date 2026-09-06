import pytest
from unittest.mock import patch

from fastapi.testclient import TestClient
from tests.fixtures.live_response import (
    build_live_response,
)
from app.api.live_forecast import (
    _live_rate_limiter,
)
from app.main import app


@pytest.fixture(autouse=True)
def clear_rate_limiter():
    _live_rate_limiter.clear()
    yield
    _live_rate_limiter.clear()


def test_live_rate_limit_blocks_after_limit():
    with TestClient(app) as client:
        with patch(
            "app.api.live_forecast."
            "LiveForecastService.get_live_forecast",
            return_value=build_live_response(),
        ):
            for _ in range(10):
                response = client.post(
                    "/v1/forecast/live",
                    json={
                        "train_number": "12615"
                    },
                )

                assert response.status_code == 200

            blocked = client.post(
                "/v1/forecast/live",
                json={
                    "train_number": "12615"
                },
            )

    assert blocked.status_code == 429

    body = blocked.json()

    assert body["success"] is False

    assert body["error"]["code"] == (
        "PROVIDER_RATE_LIMITED"
    )

    assert (
        body["error"]["retryable"]
        is True
    )

    assert body["error"]["details"] == {
        "limit": 10,
        "window_seconds": 60,
    }
