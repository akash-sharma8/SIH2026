from datetime import datetime, timezone

import numpy as np
import pandas as pd


def safe_datetime(series):
    """
    Convert timestamp values to timezone-aware UTC timestamps.
    Invalid or missing values become NaT.
    """
    return pd.to_datetime(
        series,
        errors="coerce",
        utc=True,
    )


def _base_normalize_live_journey(api_result, collected_at=None):
    """
    Convert one RailRadar live-status response into a normalized
    station-level DataFrame.

    One row represents one station in one train journey.
    """

    if not api_result.get("success"):
        raise ValueError("API response has success=false.")

    data = api_result.get("data", {})
    route = data.get("route", [])

    if not route:
        raise ValueError("API response contains no route records.")

    train_number = str(data.get("trainNumber", "")).strip()
    journey_start_date = data.get("startDate")

    if not train_number or not journey_start_date:
        raise ValueError(
            "Missing train number or journey start date."
        )

    journey_id = f"{train_number}_{journey_start_date}"

    if collected_at is None:
        collected_at = datetime.now(timezone.utc).isoformat()

    rows = []

    for halt_order, stop in enumerate(route, start=1):
        rows.append({
            "journey_id": journey_id,
            "train_number": train_number,
            "train_name": data.get("trainName"),
            "train_type": data.get("train", {}).get("type"),
            "train_category":
                data.get("train", {}).get("category"),

            "journey_start_date": journey_start_date,
            "journey_status": data.get("status"),
            "is_live": data.get("isLive"),

            "halt_order": halt_order,

            "station_sequence": stop.get("sequence"),
            "station_code": stop.get("stationCode"),
            "station_name": stop.get("stationName"),
            "is_halt": stop.get("isHalt"),
            "station_status": stop.get("status"),

            "distance_from_source_km": stop.get("distance"),
            "latitude": stop.get("lat"),
            "longitude": stop.get("lng"),
            "platform": stop.get("platform"),

            "scheduled_arrival": stop.get("scheduledArrival"),
            "scheduled_departure":
                stop.get("scheduledDeparture"),
            "actual_arrival": stop.get("actualArrival"),
            "actual_departure": stop.get("actualDeparture"),

            "api_arrival_delay_min":
                stop.get("delayArrival"),
            "api_departure_delay_min":
                stop.get("delayDeparture"),

            "speed_to_next_station_kmph":
                stop.get("speedToNextStationKmph"),

            "current_journey_delay_min":
                data.get("delayMinutes"),
            "source_last_updated_at":
                data.get("lastUpdatedAt"),
            "collected_at_utc": collected_at,
            "data_source": "railradar",
        })

    df = pd.DataFrame(rows)

    datetime_columns = [
        "scheduled_arrival",
        "scheduled_departure",
        "actual_arrival",
        "actual_departure",
        "source_last_updated_at",
        "collected_at_utc",
    ]

    for column in datetime_columns:
        df[column] = safe_datetime(df[column])

    df["calculated_arrival_delay_min"] = (
        df["actual_arrival"]
        - df["scheduled_arrival"]
    ).dt.total_seconds() / 60

    df["calculated_departure_delay_min"] = (
        df["actual_departure"]
        - df["scheduled_departure"]
    ).dt.total_seconds() / 60

    df["arrival_delay_min"] = (
        df["calculated_arrival_delay_min"]
        .combine_first(df["api_arrival_delay_min"])
    )

    df["departure_delay_min"] = (
        df["calculated_departure_delay_min"]
        .combine_first(df["api_departure_delay_min"])
    )

    df["distance_from_previous_halt_km"] = (
        df["distance_from_source_km"].diff()
    )

    df["scheduled_segment_duration_min"] = (
        df["scheduled_arrival"]
        - df["scheduled_departure"].shift(1)
    ).dt.total_seconds() / 60

    df["actual_segment_duration_min"] = (
        df["actual_arrival"]
        - df["actual_departure"].shift(1)
    ).dt.total_seconds() / 60

    df["scheduled_halt_duration_min"] = (
        df["scheduled_departure"]
        - df["scheduled_arrival"]
    ).dt.total_seconds() / 60

    df["actual_halt_duration_min"] = (
        df["actual_departure"]
        - df["actual_arrival"]
    ).dt.total_seconds() / 60

    max_distance = df["distance_from_source_km"].max()

    if pd.notna(max_distance) and max_distance > 0:
        df["route_progress"] = (
            df["distance_from_source_km"] / max_distance
        )
    else:
        df["route_progress"] = np.nan

    return df


def normalize_live_journey(api_result, collected_at=None):
    """
    Leakage-safe RailRadar parser.

    RailRadar may place forecast times for upcoming stations
    inside actualArrival/actualDeparture fields.

    This parser separates provider estimates from verified actuals.
    """

    df = _base_normalize_live_journey(
        api_result,
        collected_at=collected_at,
    ).copy()

    df["provider_estimated_arrival"] = (
        df["actual_arrival"]
    )

    df["provider_estimated_departure"] = (
        df["actual_departure"]
    )

    df["station_status_normalized"] = (
        df["station_status"]
        .astype("string")
        .str.strip()
        .str.lower()
    )

    source_update = pd.to_datetime(
        df["source_last_updated_at"],
        errors="coerce",
        utc=True,
    )

    provider_arrival = pd.to_datetime(
        df["provider_estimated_arrival"],
        errors="coerce",
        utc=True,
    )

    provider_departure = pd.to_datetime(
        df["provider_estimated_departure"],
        errors="coerce",
        utc=True,
    )

    tolerance = pd.Timedelta(minutes=5)

    valid_arrival_statuses = {
        "arrived",
        "at-station",
        "departed",
        "passed",
        "completed",
    }

    valid_departure_statuses = {
        "departed",
        "passed",
        "completed",
    }

    arrival_status_valid = (
        df["station_status_normalized"]
        .isin(valid_arrival_statuses)
    )

    departure_status_valid = (
        df["station_status_normalized"]
        .isin(valid_departure_statuses)
    )

    arrival_time_valid = (
        provider_arrival.notna()
        & source_update.notna()
        & (provider_arrival <= source_update + tolerance)
    )

    departure_time_valid = (
        provider_departure.notna()
        & source_update.notna()
        & (provider_departure <= source_update + tolerance)
    )

    df["arrival_is_observed"] = (
        arrival_status_valid
        & arrival_time_valid
    )

    df["departure_is_observed"] = (
        departure_status_valid
        & departure_time_valid
    )

    df["actual_arrival"] = provider_arrival.where(
        df["arrival_is_observed"]
    )

    df["actual_departure"] = provider_departure.where(
        df["departure_is_observed"]
    )

    df["calculated_arrival_delay_min"] = (
        df["actual_arrival"]
        - df["scheduled_arrival"]
    ).dt.total_seconds() / 60

    df["calculated_departure_delay_min"] = (
        df["actual_departure"]
        - df["scheduled_departure"]
    ).dt.total_seconds() / 60

    df["arrival_delay_min"] = (
        df["calculated_arrival_delay_min"]
    )

    df["departure_delay_min"] = (
        df["calculated_departure_delay_min"]
    )

    df["actual_segment_duration_min"] = (
        df["actual_arrival"]
        - df["actual_departure"].shift(1)
    ).dt.total_seconds() / 60

    df["actual_halt_duration_min"] = (
        df["actual_departure"]
        - df["actual_arrival"]
    ).dt.total_seconds() / 60

    df["provider_arrival_prediction_min"] = (
        df["provider_estimated_arrival"]
        - df["scheduled_arrival"]
    ).dt.total_seconds() / 60

    df["provider_departure_prediction_min"] = (
        df["provider_estimated_departure"]
        - df["scheduled_departure"]
    ).dt.total_seconds() / 60

    return df