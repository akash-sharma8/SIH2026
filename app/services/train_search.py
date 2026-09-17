from typing import Any

from app.clients.railradar import (
    RailRadarClient,
)
from app.core.config import (
    get_settings,
)
from app.services.cache import (
    ResilientCache,
)


_settings = get_settings()

_train_search_cache = ResilientCache(
    ttl_seconds=(
        _settings.search_cache_ttl_seconds
    ),
    redis_enabled=_settings.redis_enabled,
    redis_url=_settings.redis_url,
    redis_connect_timeout_seconds=(
        _settings.redis_connect_timeout_seconds
    ),
)

class TrainSearchService:
    def __init__(
        self,
        client: RailRadarClient,
    ) -> None:
        self.client = client



    def search(
        self,
        query: str,
        limit: int = 10,
    ) -> dict[str, Any]:

        normalized_query = (
            str(query or "")
            .strip()
            .lower()
        )

        cache_key = (
            f"train-search:"
            f"{normalized_query}:"
            f"{limit}"
        )

        cached_response = (
            _train_search_cache.get(
                cache_key
            )
        )

        if cached_response is not None:
            return cached_response
        
        payload = (
            self.client.search_trains(
                query=query,
                limit=limit,
            )
        )

        raw_results = payload.get(
            "data",
            [],
        )

        results = []

        if isinstance(
            raw_results,
            list,
        ):
            for item in raw_results:
                if not isinstance(
                    item,
                    dict,
                ):
                    continue

                number = str(
                    item.get(
                        "number"
                    )
                    or ""
                ).strip()

                name = str(
                    item.get(
                        "name"
                    )
                    or ""
                ).strip()

                if not number or not name:
                    continue

                results.append(
                    {
                        "train_number":
                            number,

                        "train_name":
                            name,

                        "source_code":
                            item.get(
                                "source"
                            ),

                        "source_name":
                            item.get(
                                "sourceName"
                            ),

                        "destination_code":
                            item.get(
                                "dest"
                            ),

                        "destination_name":
                            item.get(
                                "destName"
                            ),

                        "train_type":
                            item.get(
                                "type"
                            ),

                        "popularity":
                            item.get(
                                "popularity"
                            ),
                    }
                )

        response = {
            "success": True,
            "results": results,
        }

        _train_search_cache.set(
            cache_key,
            response,
        )

        return response