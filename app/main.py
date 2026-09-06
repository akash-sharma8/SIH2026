from contextlib import asynccontextmanager
from app.api.demo import router as demo_router
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.api.live_forecast import router as live_forecast_router
from app.core.errors import RailETAError
from app.api.health import router as health_router
from app.inference.artifacts import load_artifacts
from app.api.predeparture import (
    router as predeparture_router,
)
from fastapi.middleware.cors import CORSMiddleware
import time
import uuid

from app.core.config import get_settings
from app.core.logging import (
    configure_logging,
    request_logger,
)
import logging

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    settings.validate_production()

    app.state.artifacts = load_artifacts()

    yield

    app.state.artifacts = None
    
settings = get_settings()

configure_logging(
    settings.log_level
)

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

app = FastAPI(
    title="RailETA API",
    version="1.0.0-prototype",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "OPTIONS",
    ],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Request-ID",
    ],
    expose_headers=[
        "X-Request-ID",
    ],
)

@app.middleware("http")
async def request_context_middleware(
    request: Request,
    call_next,
):
    request_id = (
        request.headers.get(
            "X-Request-ID"
        )
        or str(uuid.uuid4())
    )

    request.state.request_id = (
        request_id
    )

    started_at = (
        time.perf_counter()
    )

    
    response = await call_next(
            request
    )

    duration_ms = (
        time.perf_counter()
        - started_at
    ) * 1000

    response.headers[
        "X-Request-ID"
    ] = request_id

    log_args = (
    request_id,
    request.method,
    request.url.path,
    response.status_code,
    duration_ms,
    )

    log_message = (
        "request_completed "
        "request_id=%s "
        "method=%s "
        "path=%s "
        "status_code=%s "
        "duration_ms=%.2f"
    )

    if response.status_code >= 500: 
        request_logger.error(
        log_message,
        *log_args,
    )

    elif response.status_code >= 400:   
        request_logger.warning(
            log_message,
            *log_args,
        )

    else:
        request_logger.info(
            log_message,
            *log_args,
        )

    return response

@app.exception_handler(RailETAError)
async def raileta_error_handler(
    request: Request,
    exc: RailETAError,
):
    request_id = getattr(
        request.state,
        "request_id",
        None,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "retryable": exc.retryable,
                "details": exc.details,
            },
            "request_id": request_id,
        },
        headers={
            "X-Request-ID": request_id
        } if request_id else None,
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
):
    request_id = getattr(
        request.state,
        "request_id",
        None,
    )

    request_logger.exception(
        "unhandled_exception "
        "request_id=%s "
        "method=%s "
        "path=%s "
        "exception_type=%s",
        request_id,
        request.method,
        request.url.path,
        type(exc).__name__,
    )

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": (
                    "An unexpected backend error occurred."
                ),
                "retryable": False,
                "details": None,
            },
            "request_id": request_id,
        },
        headers={
            "X-Request-ID": request_id
        } if request_id else None,
    )


app.include_router(health_router)
app.include_router(demo_router)
app.include_router(
    predeparture_router
)
app.include_router(live_forecast_router)