import logging
from unittest.mock import Mock, patch

import pytest
import requests

from app.clients.railradar import RailRadarClient
from app.core.config import Settings
from app.core.errors import (
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from app.core.rate_limit import (
    RedisGlobalRateLimiter,
)


@pytest.fixture(autouse=True)
def isolate_provider_rate_limiter(
    monkeypatch,
):
    limiter = RedisGlobalRateLimiter(
        max_requests=10,
        window_seconds=60,
        redis_enabled=False,
        redis_url="",
        redis_connect_timeout_seconds=0.5,
    )

    monkeypatch.setattr(
        "app.clients.railradar."
        "_get_provider_rate_limiter",
        lambda *args, **kwargs: limiter,
    )

    yield

    limiter.clear()

def build_client():
    settings = Settings(
        railradar_base_url=(
            "https://api.railradar.in/v1"
        ),
        railradar_api_key=(
            "super-secret-test-key"
        ),
    )

    return RailRadarClient(
        settings=settings,
        timeout_seconds=5,
    )


def test_success_log_does_not_expose_secret(
    caplog,
):
    client = build_client()

    response = Mock()
    response.status_code = 200
    response.json.return_value = {
        "success": True,
        "data": {},
    }

    with patch.object(
        client.session,
        "get",
        return_value=response,
    ):
        with caplog.at_level(
            logging.INFO,
            logger="raileta.provider",
        ):
            result = client.get_live_journey(
                "12615",
            )

    assert result["success"] is True

    logs = caplog.text

    assert (
        "provider_request_started"
        in logs
    )

    assert (
        "provider_response_received"
        in logs
    )

    assert (
        "super-secret-test-key"
        not in logs
    )

    assert (
        "Authorization"
        not in logs
    )


def test_timeout_log_is_safe(
    caplog,
):
    client = build_client()

    with patch.object(
        client.session,
        "get",
        side_effect=requests.Timeout(),
    ):
        with caplog.at_level(
            logging.WARNING,
            logger="raileta.provider",
        ):
            try:
                client.get_live_journey(
                    "12615",
                )
            except ProviderTimeoutError:
                pass

    logs = caplog.text

    assert (
        "provider_request_timeout"
        in logs
    )

    assert (
        "super-secret-test-key"
        not in logs
    )

    assert (
        "Authorization"
        not in logs
    )


def test_network_failure_log_is_safe(
    caplog,
):
    client = build_client()

    with patch.object(
        client.session,
        "get",
        side_effect=requests.ConnectionError(
            "connection failed",
        ),
    ):
        with caplog.at_level(
            logging.WARNING,
            logger="raileta.provider",
        ):
            try:
                client.get_live_journey(
                    "12615",
                )
            except ProviderUnavailableError:
                pass

    logs = caplog.text

    assert (
        "provider_request_failed"
        in logs
    )

    assert (
        "ConnectionError"
        in logs
    )

    assert (
        "super-secret-test-key"
        not in logs
    )

    assert (
        "Authorization"
        not in logs
    )