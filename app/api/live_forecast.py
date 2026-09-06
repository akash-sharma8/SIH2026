from fastapi import APIRouter, Request
from app.schemas.responses import LiveForecastResponse
from app.core.config import get_settings
from app.core.errors import ProviderRateLimitError
from app.core.rate_limit import SlidingWindowRateLimiter
from app.schemas.requests import LiveForecastRequest
from app.services.forecast import LiveForecastService
from app.schemas.responses import (
    ApplicationErrorResponse,
    LiveForecastResponse,
)


settings = get_settings()

_live_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.max_live_requests_per_minute,
    window_seconds=60,
)

router = APIRouter(
    prefix="/v1/forecast",
    tags=["forecast"],
)

@router.post(
    "/live",
    response_model=LiveForecastResponse,
    responses={
        404: {
            "model": ApplicationErrorResponse,
            "description": (
                "Requested train journey "
                "was not found."
            ),
        },
        429: {
            "model": ApplicationErrorResponse,
            "description": (
                "Client or provider rate "
                "limit was reached."
            ),
        },
        503: {
            "model": ApplicationErrorResponse,
            "description": (
                "Provider or backend dependency "
                "is unavailable."
            ),
        },
        504: {
            "model": ApplicationErrorResponse,
            "description": (
                "Provider request timed out."
            ),
        },
    },
)
def live_forecast(
    payload: LiveForecastRequest,
    request: Request,
):
    client_host = (
        request.client.host
        if request.client
        else "unknown"
    )

    rate_limit_key = (
        f"live:{client_host}"
    )

    if not _live_rate_limiter.allow(
        rate_limit_key
    ):
        raise ProviderRateLimitError(
            "Live forecast request limit "
            "has been reached.",
            details={
                "limit":
                    settings.max_live_requests_per_minute,
                "window_seconds":
                    60,
            },
        )

    artifacts = (
        request.app.state.artifacts
    )

    service = LiveForecastService()

    return service.get_live_forecast(
        train_number=
            payload.train_number,
        journey_date=
            payload.journey_date_string(),
        artifacts=artifacts,
    )