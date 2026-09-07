from unittest.mock import Mock, patch

import pytest
import requests

from app.clients.railradar import RailRadarClient
from app.core.config import Settings
from app.core.errors import (
    JourneyNotFoundError,
    ProviderConfigurationError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)


def make_settings():
    return Settings(
        railradar_base_url="https://api.railradar.in/v1",
        railradar_api_key="test-key",
    )


def test_live_request_contract():
    client = RailRadarClient(
        make_settings()
    )

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
    ) as mocked_get:
        result = client.get_live_journey(
            "12615",
            journey_date="2026-09-01",
        )

    assert result["success"] is True

    mocked_get.assert_called_once_with(
        "https://api.railradar.in/v1/trains/12615/live",
        headers={
            "Authorization": "Bearer test-key",
            "Accept": "application/json",
        },
        params={
            "haltsOnly": "true",
            "includeCoordinates": "true",
            "geometry": "false",
            "authoritative": "false",
            "date": "2026-09-01",
        },
        timeout=(
            3.05,
            10,
        ),
    )


@pytest.mark.parametrize(
    ("status_code", "error_class"),
    [
        (
            401,
            ProviderConfigurationError,
        ),
        (
            404,
            JourneyNotFoundError,
        ),
        (
            429,
            ProviderRateLimitError,
        ),
        (
            503,
            ProviderUnavailableError,
        ),
    ],
)
def test_provider_http_error_mapping(
    status_code,
    error_class,
):
    client = RailRadarClient(
        make_settings()
    )

    response = Mock()
    response.status_code = status_code
    response.json.return_value = {
        "success": False,
        "error": {
            "code": "TEST_ERROR",
            "message": "provider failure",
        },
    }

    with patch.object(
        client.session,
        "get",
        return_value=response,
    ):
        with pytest.raises(
            error_class
        ):
            client.get_live_journey(
                "12615"
            )


def test_timeout_mapping():
    client = RailRadarClient(
        make_settings()
    )

    with patch.object(
        client.session,
        "get",
        side_effect=requests.Timeout(
            "timed out",
        ),
    ):
        with pytest.raises(
            ProviderTimeoutError
        ):
            client.get_live_journey(
                "12615"
            )


def test_network_error_mapping():
    client = RailRadarClient(
        make_settings()
    )

    with patch.object(
        client.session,
        "get",
        side_effect=requests.ConnectionError(
            "connection failed",
        ),
    ):
        with pytest.raises(
            ProviderUnavailableError
        ):
            client.get_live_journey(
                "12615"
            )


def test_non_json_response_mapping():
    client = RailRadarClient(
        make_settings()
    )

    response = Mock()
    response.status_code = 502
    response.json.side_effect = ValueError(
        "not json"
    )

    with patch.object(
        client.session,
        "get",
        return_value=response,
    ):
        with pytest.raises(
            ProviderUnavailableError
        ):
            client.get_live_journey(
                "12615"
            )