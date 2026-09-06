import logging
import time
from typing import Any

import requests

from app.core.config import Settings
from app.core.errors import (
    JourneyNotFoundError,
    ProviderConfigurationError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
) 

provider_logger = logging.getLogger("raileta.provider")

class RailRadarClient:
    def __init__(
        self,
        settings: Settings,
        timeout_seconds: int = 30,
    ) -> None:
        self.base_url = (
            settings.railradar_base_url
            or ""
        ).rstrip("/")

        self.api_key = (
            settings.railradar_api_key
            or ""
        ).strip()

        self.timeout_seconds = (
            timeout_seconds
        )

    def get_live_journey(
        self,
        train_number: str,
        journey_date: str | None = None,
        authoritative: bool = False,
    ) -> dict[str, Any]:
        train_number = str(
            train_number or ""
        ).strip()

        if not train_number:
            raise ValueError(
                "Train number is required."
            )

        if not train_number.isdigit():
            raise ValueError(
                "Train number must contain "
                "digits only."
            )

        normalized_train_number = (
            train_number.zfill(5)
        )

        params = {
            "haltsOnly": "true",
            "includeCoordinates": "true",
            "geometry": "false",
            "authoritative":
                str(
                    bool(authoritative)
                ).lower(),
        }

        if journey_date is not None:
            journey_date = str(
                journey_date
            ).strip()

            if journey_date:
                params["date"] = (
                    journey_date
                )

        return self._get(
            endpoint=(
                f"/trains/"
                f"{normalized_train_number}"
                f"/live"
            ),
            params=params,
        )

    def _get(
        self,
        endpoint: str,
        params: dict | None = None,
    ) -> dict[str, Any]:
        if not self.base_url:
            raise ProviderConfigurationError(
                "RailRadar base URL is "
                "not configured."
            )

        if not self.api_key:
            raise ProviderConfigurationError(
                "RailRadar API key is "
                "not configured."
            )

        if not endpoint.startswith("/"):
            endpoint = (
                "/" + endpoint
            )

        url = (
            self.base_url
            + endpoint
        )

        headers = {
            "Authorization":
                f"Bearer {self.api_key}",
            "Accept":
                "application/json",
        }

        started_at = (
            time.perf_counter()
        )
        provider_logger.info(
            "provider_request_started "
            "provider=railradar "
            "endpoint=%s",
            endpoint,
        )

        try:
            response = requests.get(
                url,
                headers=headers,
                params=params,
                timeout=self.timeout_seconds,
            )

        except requests.Timeout as exc:
            elapsed = (
                time.perf_counter()
        - started_at
        )

            provider_logger.warning(
                "provider_request_timeout "
                "provider=railradar "
                "endpoint=%s "
                "duration_ms=%.2f",
                endpoint,
                elapsed * 1000,
            )

            raise ProviderTimeoutError(
                "RailRadar request timed out.",
                details={
                    "endpoint": endpoint,
                    "elapsed_seconds":
                        round(elapsed, 3),
                },
            ) from exc
        
        except requests.RequestException as exc:
            elapsed = (
                time.perf_counter()
                - started_at
            )

            provider_logger.warning(
                "provider_request_failed "
                "provider=railradar "
                "endpoint=%s "
                "duration_ms=%.2f "
                "exception_type=%s",
                endpoint,
                elapsed * 1000,
                type(exc).__name__,
            )

            raise ProviderUnavailableError(
                "Network request to RailRadar "
                "failed.",
                details={
                "endpoint": endpoint,
                "exception_type":
                type(exc).__name__,
                "elapsed_seconds":
                round(elapsed, 3),
            },
        ) from exc

        elapsed = (
            time.perf_counter()
            - started_at
        )

        provider_logger.info(
            "provider_response_received "
            "provider=railradar "
            "endpoint=%s "
            "status_code=%s "
            "duration_ms=%.2f",
            endpoint,
            response.status_code,
            elapsed * 1000,
        )

        try:
            payload = response.json()

        except ValueError:
            provider_logger.warning(
                "provider_invalid_json "
                "provider=railradar "
                "endpoint=%s "
                "status_code=%s "
                "duration_ms=%.2f",
                endpoint,
                response.status_code,
                elapsed * 1000,
            )
            raise ProviderUnavailableError(
                "RailRadar returned a "
                "non-JSON response.",
                details={
                    "http_status":
                        response.status_code,
                    "endpoint":
                        endpoint,
                    "elapsed_seconds":
                        round(elapsed, 3),
                },
            )

        error = (
            payload.get("error")
            if isinstance(payload, dict)
            else None
        ) or {}

        if response.status_code == 401:
            raise ProviderConfigurationError(
                "RailRadar authentication "
                "failed.",
                details={
                    "http_status": 401,
                    "provider_code":
                        error.get("code"),
                },
            )

        if response.status_code == 404:
            raise JourneyNotFoundError(
                "Requested train journey "
                "was not available.",
                details={
                    "http_status": 404,
                    "provider_code":
                        error.get("code"),
                },
            )

        if response.status_code == 429:
            raise ProviderRateLimitError(
                "RailRadar rate limit or "
                "quota has been reached.",
                details={
                    "http_status": 429,
                    "provider_code":
                        error.get("code"),
                },
            )

        if response.status_code == 503:
            raise ProviderUnavailableError(
                "RailRadar upstream railway "
                "telemetry is temporarily "
                "unavailable.",
                details={
                    "http_status": 503,
                    "provider_code":
                        error.get("code"),
                },
            )

        success = (
            response.status_code == 200
            and isinstance(
                payload,
                dict,
            )
            and payload.get(
                "success",
                False,
            )
        )

        if not success:
            raise ProviderUnavailableError(
                "RailRadar request failed.",
                details={
                    "http_status":
                        response.status_code,
                    "provider_code":
                        error.get("code"),
                    "provider_message":
                        error.get("message"),
                    "endpoint":
                        endpoint,
                },
            )

        return payload