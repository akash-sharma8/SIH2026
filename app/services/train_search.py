from typing import Any

from app.clients.railradar import (
    RailRadarClient,
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

        return {
            "success": True,
            "results": results,
        }