from fastapi import APIRouter, Request
from app.schemas.responses import (
    PredepartureForecastResponse,
)
from app.core.config import get_settings
from app.core.errors import (
    InvalidJourneyStateError,
    ProviderRateLimitError,
)
from app.core.rate_limit import (
    SlidingWindowRateLimiter,
)
from app.core.errors import InvalidJourneyStateError
from app.schemas.requests import (
    PredepartureForecastRequest,
)
from app.services.forecast import (
    PredepartureService,
)
from app.schemas.responses import (
    ApplicationErrorResponse,
    PredepartureForecastResponse,
)

settings = get_settings()

_predeparture_rate_limiter = (
    SlidingWindowRateLimiter(
        max_requests=(
            settings.max_live_requests_per_minute
        ),
        window_seconds=60,
    )
)

router = APIRouter(
    prefix="/v1/forecast",
    tags=["forecast"],
)

predeparture_service = (
    PredepartureService()
)


@router.post(
    "/predeparture",
    response_model=PredepartureForecastResponse,
    responses={
        422: {
            "description": (
                "Request validation failed "
                "or journey/model input is invalid."
            ),
        },
        500: {
            "model": ApplicationErrorResponse,
            "description": (
                "Prediction failed unexpectedly."
            ),
        },
        503: {
            "model": ApplicationErrorResponse,
            "description": (
                "Required model artifact or "
                "backend dependency is unavailable."
            ),
        },
    },
)
def get_predeparture_forecast(
    payload: PredepartureForecastRequest,
    request: Request,
):

    client_host = (
        request.client.host
        if request.client
        else "unknown"
    )

    rate_limit_key = (
        f"predeparture:{client_host}"
    )

    if not _predeparture_rate_limiter.allow(
        rate_limit_key
    ):
        raise ProviderRateLimitError(
            "Predeparture forecast request "
            "limit has been reached.",
            details={
                "limit": (
                    settings
                    .max_live_requests_per_minute
                ),
                "window_seconds": 60,
            },
        )    
    
    artifacts = (
        request.app.state.artifacts
    )

    try:
        return (
            predeparture_service
            .get_predeparture_forecast(
                request_data=payload,
                artifacts=artifacts,
            )
        )

    except ValueError as exc:
        raise InvalidJourneyStateError(
            str(exc)
        ) from exc