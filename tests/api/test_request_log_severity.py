import logging
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.core.errors import (
    JourneyNotFoundError,
    ProviderUnavailableError,
)


def test_200_logs_info(
    caplog,
):
    with caplog.at_level(
        logging.INFO,
        logger="raileta.request",
    ):
        with TestClient(app) as client:
            response = client.get(
                "/health"
            )

    assert response.status_code == 200

    assert any(
        record.levelno == logging.INFO
        and "status_code=200"
        in record.getMessage()
        for record in caplog.records
    )


def test_404_logs_warning(
    caplog,
):
    with TestClient(app) as client:
        with patch(
            "app.api.live_forecast."
            "LiveForecastService."
            "get_live_forecast",
            side_effect=JourneyNotFoundError(
                "Journey not found."
            ),
        ):
            with caplog.at_level(
                logging.WARNING,
                logger="raileta.request",
            ):
                response = client.post(
                    "/v1/forecast/live",
                    json={
                        "train_number":
                            "12615"
                    },
                )

    assert response.status_code == 404

    assert any(
        record.levelno == logging.WARNING
        and "status_code=404"
        in record.getMessage()
        for record in caplog.records
    )


def test_503_logs_error(
    caplog,
):
    with TestClient(app) as client:
        with patch(
            "app.api.live_forecast."
            "LiveForecastService."
            "get_live_forecast",
            side_effect=
                ProviderUnavailableError(
                    "Provider unavailable."
                ),
        ):
            with caplog.at_level(
                logging.ERROR,
                logger="raileta.request",
            ):
                response = client.post(
                    "/v1/forecast/live",
                    json={
                        "train_number":
                            "12615"
                    },
                )

    assert response.status_code == 503

    assert any(
        record.levelno == logging.ERROR
        and "status_code=503"
        in record.getMessage()
        for record in caplog.records
    )