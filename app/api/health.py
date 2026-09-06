from pathlib import Path
from pyexpat import model

from fastapi import APIRouter, Request
from app.schemas.responses import (
    HealthResponse,
    ReadyResponse,
)
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/health",response_model=HealthResponse)
def health():
    return {
        "status": "healthy",
        "version": "1.0.0-prototype",
    }


@router.get("/ready",
            response_model=ReadyResponse,
            responses={
                503: {
                    "model": ReadyResponse,
                    "description": (
                    "Backend is alive but not ready "
                    "to serve inference."
            ),
        }
    },
)


def ready(request: Request):
    artifacts = getattr(request.app.state, "artifacts", None)

    demo_path = (
        Path(__file__).resolve().parents[2]
        / "ml_handoff"
        / "raileta_space"
        / "demo"
        / "saved_journey_12615.json"
    )

    model1_loaded = artifacts is not None and artifacts.model1 is not None
    model2_loaded = artifacts is not None and artifacts.model2 is not None
    model3_loaded = artifacts is not None and artifacts.model3 is not None

    configs_loaded = artifacts is not None and all(
        isinstance(config, dict)
        for config in [
            artifacts.model1_metadata,
            artifacts.model2_metadata,
            artifacts.model3_config,
            artifacts.fusion_config,
            artifacts.hybrid_manifest,
            artifacts.system_manifest,
        ]
    )

    ready_state = all(
        [
            model1_loaded,
            model2_loaded,
            model3_loaded,
            configs_loaded,
            demo_path.is_file(),
        ]
    )

    payload = {
        "status": "ready" if ready_state else "not_ready",
        "version": "1.0.0-prototype",
        "artifacts": {
            "model1": model1_loaded,
            "model2": model2_loaded,
            "model3": model3_loaded,
            "configs": configs_loaded,
        },
        "demo_available": demo_path.is_file(),
    }   

    if not ready_state:
        return JSONResponse(
            status_code=503,
            content=payload,
        )

    return payload