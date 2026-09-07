from fastapi import (
    APIRouter,
    Query,
)

from app.clients.railradar import (
    RailRadarClient,
)
from app.core.config import (
    get_settings,
)
from app.schemas.train_search import (
    TrainSearchResponse,
)
from app.services.train_search import (
    TrainSearchService,
)


router = APIRouter(
    prefix="/v1/trains",
    tags=["trains"],
)


@router.get(
    "/search",
    response_model=TrainSearchResponse,
)
def search_trains(
    q: str = Query(
        ...,
        min_length=1,
        max_length=100,
    ),
    limit: int = Query(
        10,
        ge=1,
        le=20,
    ),
):
    client = RailRadarClient(
        get_settings()
    )

    service = TrainSearchService(
        client
    )

    return service.search(
        query=q,
        limit=limit,
    )