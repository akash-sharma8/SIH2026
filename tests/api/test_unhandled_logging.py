import logging
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


def test_unhandled_exception_logs_once(
    caplog,
):
    with caplog.at_level(
        logging.ERROR,
        logger="raileta.request",
    ):
        with TestClient(
            app,
            raise_server_exceptions=False,
        ) as client:
            with patch(
                "app.api.live_forecast."
                "LiveForecastService."
                "get_live_forecast",
                side_effect=RuntimeError(
                    "boom"
                ),
            ):
                response = client.post(
                    "/v1/forecast/live",
                    json={
                        "train_number":
                            "12615"
                    },
                )

    assert response.status_code == 500

    messages = [
        record.getMessage()
        for record in caplog.records
        if record.name
        == "raileta.request"
    ]

    unhandled_logs = [
        message
        for message in messages
        if "unhandled_exception"
        in message
    ]

    request_failed_logs = [
        message
        for message in messages
        if "request_failed"
        in message
    ]

    assert len(unhandled_logs) == 1
    assert len(request_failed_logs) == 0