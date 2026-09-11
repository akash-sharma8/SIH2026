from __future__ import annotations

from datetime import date

import pandas as pd

from app.clients.railradar import RailRadarClient
from app.core.config import get_settings

def _normalize_train_type(
    train_type: str | None,
    train_category: str | None,
) -> str | None:
    raw_type = str(
        train_type or ""
    ).strip().upper()

    raw_category = str(
        train_category or ""
    ).strip().upper()

    mappings = {
        "SUPERFAST":
            "Superfast Express",

        "RAJDHANI":
            "Rajdhani Express",

        "SHATABDI":
            "Shatabdi Express",

        "JAN SHATABDI":
            "Jan Shatabdi Express",

        "DURONTO":
            "Duronto Express",

        "GARIB RATH":
            "Garib Rath Express",

        "HUMSAFAR":
            "Humsafar Express",

        "TEJAS":
            "Tejas Express",

        "VANDE BHARAT":
            "Vande Bharat Express",

        "GATIMAAN":
            "Gatimaan Express",

        "SAMPARK KRANTI":
            "Sampark Kranti Express",

        "INTERCITY":
            "Intercity Express",

        "PASSENGER":
            "Passenger Train",

        "DEMU":
            "DEMU/MEMU",

        "MEMU":
            "DEMU/MEMU",
    }

    if raw_type in mappings:
        return mappings[
            raw_type
        ]

    if (
        raw_type in {
            "EXPRESS",
            "MAIL",
            "MAIL/EXPRESS",
        }
        or raw_category == "EXPRESS"
    ):
        return "Mail/Express"

    return None

def _season_from_month(month: int) -> str:
    if month in {12, 1, 2}:
        return "Winter"

    if month in {3, 4, 5}:
        return "Summer"

    if month in {6, 7, 8, 9}:
        return "Monsoon"

    return "Post-Monsoon"


def _is_peak_hour(hour: int) -> int:
    return int(
        hour in {
            7, 8, 9, 10,
            17, 18, 19, 20,
        }
    )


def _is_night_departure(hour: int) -> int:
    return int(
        hour >= 22 or hour <= 5
    )


def _parse_schedule_time(value) -> pd.Timestamp | None:
    if value is None:
        return None

    parsed = pd.to_datetime(
        value,
        errors="coerce",
    )

    if pd.isna(parsed):
        return None

    return parsed

def build_predeparture_features(
    train_number: str,
    journey_date: date,
) -> dict:
    client = RailRadarClient(
        get_settings()
    )

    provider_result = (
        client.get_live_journey(
            train_number=train_number,
            journey_date=journey_date.isoformat(),
            authoritative=False,
        )
    )

    if not isinstance(
        provider_result,
        dict,
    ):
        raise ValueError(
            "RailRadar returned an invalid response."
        )

    if provider_result.get(
        "success"
    ) is not True:
        raise ValueError(
            "RailRadar could not load the journey."
        )

    data = provider_result.get(
        "data",
        {},
    )

    if not isinstance(
        data,
        dict,
    ):
        raise ValueError(
            "RailRadar journey payload is invalid."
        )

    raw_route = data.get(
        "route",
        [],
    )

    if not isinstance(
        raw_route,
        list,
    ) or not raw_route:
        raise ValueError(
            "Journey route is unavailable."
        )

    train = data.get(
        "train",
        {},
    )

    if not isinstance(
        train,
        dict,
    ):
        train = {}

    valid_stops = [
        stop
        for stop in raw_route
        if isinstance(
            stop,
            dict,
        )
    ]

    if not valid_stops:
        raise ValueError(
            "Journey route contains no valid stops."
        )

    first_stop = valid_stops[0]
    last_stop = valid_stops[-1]

    first_departure = (
        _parse_schedule_time(
            first_stop.get(
                "scheduledDeparture"
            )
        )
        or _parse_schedule_time(
            first_stop.get(
                "scheduledArrival"
            )
        )
    )

    last_arrival = (
        _parse_schedule_time(
            last_stop.get(
                "scheduledArrival"
            )
        )
        or _parse_schedule_time(
            last_stop.get(
                "scheduledDeparture"
            )
        )
    )

    if first_departure is None:
        raise ValueError(
            "Scheduled source departure is unavailable."
        )

    if last_arrival is None:
        raise ValueError(
            "Scheduled destination arrival is unavailable."
        )

    distance_candidates = []

    for stop in valid_stops:
        try:
            distance_value = float(
                stop.get("distance")
            )

        except (
            TypeError,
            ValueError,
        ):
            continue

        if distance_value >= 0:
            distance_candidates.append(
                distance_value
            )

    if not distance_candidates:
        raise ValueError(
            "Route distance is unavailable."
        )

    distance_km = max(
        distance_candidates
    )

    scheduled_travel_hours = (
        last_arrival
        - first_departure
    ).total_seconds() / 3600

    if scheduled_travel_hours <= 0:
        raise ValueError(
            "Scheduled travel duration is invalid."
        )

    departure_hour = int(
        first_departure.hour
    )

    derived = {
        "train_number":
            str(
                data.get(
                    "trainNumber",
                    train_number,
                )
            ).strip(),

       "train_name":
            data.get(
                "trainName"
            ),

        "train_type":
            _normalize_train_type(
                train.get(
                    "type"
                ),
                train.get(
                    "category"
                ),
            ),

        "train_category":
            train.get(
                "category"
            ),
        "journey_status":
            str(
                data.get(
                    "status",
                    "",
                )
            ).strip().lower(),

        "year":
            journey_date.year,

        "month":
            journey_date.month,

        "day_of_week":
            journey_date.weekday(),

        "departure_hour":
            departure_hour,

        "is_weekend":
            int(
                journey_date.weekday()
                >= 5
            ),

        "is_night_departure":
            _is_night_departure(
                departure_hour
            ),

        "is_peak_hour":
            _is_peak_hour(
                departure_hour
            ),

        "season":
            _season_from_month(
                journey_date.month
            ),

        "distance_km":
            distance_km,

        "num_scheduled_stops":
            len(
                valid_stops
            ),

        "scheduled_travel_hours":
            scheduled_travel_hours,
    }


    model_features = {
        "train_number":
            derived["train_number"],

        "train_type":
            derived["train_type"],

        "year":
            derived["year"],

        "month":
            derived["month"],

        "day_of_week":
            derived["day_of_week"],

        "departure_hour":
            derived["departure_hour"],

        "is_weekend":
            derived["is_weekend"],

        "is_night_departure":
            derived["is_night_departure"],

        "is_peak_hour":
            derived["is_peak_hour"],

        "season":
            derived["season"],

        "distance_km":
            derived["distance_km"],

        "num_scheduled_stops":
            derived["num_scheduled_stops"],

        "scheduled_travel_hours":
            derived["scheduled_travel_hours"],
    }


    return {
        "provider_payload":
            provider_result,

        "derived":
            derived,

        "model_features":
            model_features,
    }