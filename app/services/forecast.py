import logging
from datetime import date, timedelta
from app.clients.railradar import RailRadarClient
from app.core.config import get_settings
from app.core.errors import PredictionError
from app.inference.adapter import InferenceAdapter
from app.inference.model1 import (
    predict_model1_predeparture,
)

from app.clients.openweather import OpenWeatherClient
from app.services.weather_corridor import (
    WeatherCorridorService,
)
from app.services.provider_route_adapter import (
    extract_provider_route_data,
)
from app.inference.explainability import (
    build_model1_explanation,
    build_live_prediction_explanation,
)

from app.inference.evaluation import (
    get_live_evaluation,
    get_model1_evaluation,
)
from app.inference.normalizer import (
    normalize_live_journey,
)
from app.schemas.requests import (
    PredepartureForecastRequest,
)

from app.services.cache import TTLCache
from app.services.route_map_builder import build_route_map

from app.clients.openweather_forecast import (
    OpenWeatherForecastClient,
)

from app.services.eta_weather_corridor import (
    ETAWeatherCorridorService,
)

logger = logging.getLogger(
    "raileta.forecast"
)

_live_payload_cache = TTLCache(
    ttl_seconds=get_settings().cache_ttl_seconds
)

def _normalize_provider_status(
    value,
) -> str:
    return (
        str(value or "")
        .strip()
        .lower()
        .replace("_", "-")
    )


def _resolve_latest_valid_journey(
    client: RailRadarClient,
    train_number: str,
    initial_result: dict,
    max_lookback_days: int = 7,
) -> dict:
    if not isinstance(
        initial_result,
        dict,
    ):
        return initial_result

    initial_data = initial_result.get(
        "data",
        {},
    )

    initial_status = (
        _normalize_provider_status(
            initial_data.get("status")
        )
    )

    if initial_status in {
        "running",
        "completed",
    }:
        return initial_result

    if initial_status not in {
        "not-started",
        "not started",
    }:
        return initial_result

    start_date_raw = str(
        initial_data.get("startDate")
        or ""
    ).strip()

    if not start_date_raw:
        return initial_result

    try:
        provider_start_date = (
            date.fromisoformat(
                start_date_raw
            )
        )
    except ValueError:
        return initial_result

    for days_back in range(
        1,
        max_lookback_days + 1,
    ):
        candidate_date = (
            provider_start_date
            - timedelta(
                days=days_back
            )
        ).isoformat()

        try:
            candidate_result = (
                client.get_live_journey(
                    train_number=train_number,
                    journey_date=candidate_date,
                    authoritative=False,
                )
            )
        except Exception:
            continue

        if not isinstance(
            candidate_result,
            dict,
        ):
            continue

        if (
            candidate_result.get("success")
            is not True
        ):
            continue

        candidate_data = (
            candidate_result.get(
                "data",
                {},
            )
        )

        candidate_status = (
            _normalize_provider_status(
                candidate_data.get("status")
            )
        )

        candidate_route = (
            candidate_data.get(
                "route",
                [],
            )
            or []
        )

        if (
            candidate_status
            in {
                "running",
                "completed",
            }
            and candidate_route
        ):
            return candidate_result

    return initial_result



class PredepartureService:
    def get_predeparture_forecast(
        self,
        request_data: PredepartureForecastRequest,
        artifacts,
    ) -> dict:
        try:
            features = (
                request_data.to_model1_features()
            )

            response = (
                predict_model1_predeparture(
                    features,
                    model=artifacts.model1,
                    metadata=
                        artifacts.model1_metadata,
                    strict=True,
                )
            )

            if not isinstance(response, dict):
                raise PredictionError(
                    "Model 1 returned an "
                    "invalid response."
                )

            if response.get("success") is not True:
                raise PredictionError(
                    "Model 1 could not generate "
                    "the pre-departure forecast."
                )

            try:
                prediction_explanation = (
                    build_model1_explanation(
                        features,
                        model=artifacts.model1,
                        metadata=artifacts.model1_metadata,
                        top_k=5,
                    )
                )
            except Exception:
                prediction_explanation = {
                    "method": "UNAVAILABLE",
                    "factors": [],
                    "explanation_available": False,
                    "source": "MODEL_1_EXPLANATION_FAILED",
                }

            try:
                evaluation = get_model1_evaluation()
            except Exception:
                evaluation = None

            response["diagnostics"] = {
                "prediction_explanation":
                    prediction_explanation,
                "evaluation":
                    evaluation,
            }

            return response

        except ValueError:
            raise

        except PredictionError:
            raise

        except Exception as exc:
            raise PredictionError(
                "Failed to generate the "
                "pre-departure forecast.",
                details={
                    "exception_type":
                        type(exc).__name__,
                },
            ) from exc



class LiveForecastService:
    def get_live_forecast(
        self,
        train_number: str,
        journey_date: str | None,
        artifacts,
    ) -> dict:
        normalized_train_number = (
            str(train_number)
            .strip()
            .zfill(5)
        )

        normalized_date = (
            str(journey_date).strip()
            if journey_date
            else ""
        )

        cache_key = (
            f"live:{normalized_train_number}:"
            f"{normalized_date or 'latest'}"
        )

        api_result = (
            _live_payload_cache.get(
                cache_key
            )
        )

        cache_status = "HIT"

        if api_result is None:
            cache_status = "MISS"

            client = RailRadarClient(
                get_settings()
            )

            api_result = client.get_live_journey(
                train_number=normalized_train_number,
                journey_date=journey_date,
                authoritative=False,
            )

            # if not normalized_date:
            #     api_result = (
            #         _resolve_latest_valid_journey(
            #             client=client,
            #             train_number=
            #                 normalized_train_number,
            #             initial_result=
            #                 api_result,
            #             max_lookback_days=7,
            #         )
            #     )

            _live_payload_cache.set(
                cache_key,
                api_result,
            )

        try:
            adapter = InferenceAdapter(
                artifacts
            )

            response = adapter.run_payload(
                api_result
            )

            if not isinstance(
                response,
                dict,
            ):
                raise PredictionError(
                    "Live inference returned "
                    "an invalid response."
                )

            if response.get(
                "success"
            ) is not True:
                raise PredictionError(
                    "Live inference could not "
                    "generate ETA predictions."
                )

            journey = response.get(
                "journey",
                {},
            )

            predictions = response.get(
                "predictions",
                [],
            )

            current_station_code = (
                journey.get(
                    "current_station_code"
                )
                if isinstance(
                    journey,
                    dict,
                )
                else None
            )
            provider_route_data = (
                extract_provider_route_data(
                api_result
                )
            )

            route = build_route_map(
                current_station_code=(
                    current_station_code
                ),
                predictions=(
                    predictions
                    if isinstance(
                        predictions,
                        list,
                    )
                    else []
                ),
                provider_route_data=(
                    provider_route_data
                ),
            )

            response["route"] = (
                route.model_dump()
            )

            weather_corridor = []

            weather_api_key = getattr(
                get_settings(),
                "openweather_api_key",
                None,
            )

            if weather_api_key:
                try:
                    weather_client = OpenWeatherClient(
                        api_key=weather_api_key,
                )

                    weather_service = (
                        WeatherCorridorService(
                            weather_client,
                            max_stations=8,
                        )
                    )

                    weather_corridor = (
                        weather_service.build_corridor(
                            route
                        )
                )

                except Exception:
                    weather_corridor = []

            response["weather_corridor"] = [
                weather.model_dump()
                for weather in weather_corridor
            ]

            eta_weather_corridor = []

            weather_api_key = getattr(
                get_settings(),
                "openweather_api_key",
            None,
            )

            if weather_api_key:
                try:
                    forecast_weather_client = (
                        OpenWeatherForecastClient(
                            api_key=weather_api_key,
                        )
                    )

                    eta_weather_service = (
                        ETAWeatherCorridorService(
                            forecast_weather_client,
                            max_stations=8,
                        )
                    )

                    eta_weather_corridor = (
                        eta_weather_service
                        .build_corridor(
                            route=route,
                            predictions=predictions,
                        )
                    )

                except Exception:
                    eta_weather_corridor = []

            response["eta_weather_corridor"] = [
                item.model_dump()
                for item in eta_weather_corridor
            ]
            try:
                normalized_df = normalize_live_journey(
                    api_result
                )

                prediction_explanation = (
                    build_live_prediction_explanation(
                        normalized_df,
                        artifacts=artifacts,
                        predictions=(
                            predictions
                            if isinstance(
                                predictions,
                                list,
                            )
                            else []
                        ),
                        top_k=5,
                    )
                )

            except Exception:
                prediction_explanation = {
                    "method": "UNAVAILABLE",
                    "factors": [],
                    "explanation_available": False,
                    "source": "DIAGNOSTICS_BUILD_FAILED",
                }


            try:
                evaluation = get_live_evaluation(
                    predictions
                    if isinstance(
                        predictions,
                        list,
                    )
                    else []
                )
            except Exception:
                evaluation = None


            response["diagnostics"] = {
                "prediction_explanation":
                    prediction_explanation,
                "evaluation":
                    evaluation,
            }

            response["backend"] = {
                "provider_payload_cache": (
                    cache_status
                ),
                "cache_ttl_seconds": (
                    get_settings().cache_ttl_seconds
                ),
            }
            return response

        except PredictionError:
            raise

        except Exception as exc:
            logger.exception(
                "live_forecast_failed "
                "train_number=%s "
                "journey_date=%s "
                "exception_type=%s "
                "exception_message=%s",
                normalized_train_number,
                journey_date,
                type(exc).__name__,
                str(exc),
            )

            raise PredictionError(
                "Failed to generate the "
                "live ETA forecast.",
                details={
                    "exception_type":
                        type(exc).__name__,
                },
            ) from exc