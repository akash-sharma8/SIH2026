from fastapi import APIRouter, Request

from app.services.demo import DemoService
from app.schemas.responses import LiveForecastResponse

router = APIRouter(
    prefix="/v1",
    tags=["demo"],
)

demo_service = DemoService()


@router.get("/demo",response_model=LiveForecastResponse,)
def get_demo_forecast(
    request: Request,
) :
    artifacts = request.app.state.artifacts

    return demo_service.get_demo_forecast(
        artifacts=artifacts
    )


