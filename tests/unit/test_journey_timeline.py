import pandas as pd

from app.services.journey_timeline import (
    build_journey_timeline,
)


def test_running_journey_timeline_contains_history_and_predictions():
    df = pd.DataFrame(
        [
            {
                "halt_order": 1,
                "journey_status": "running",
                "station_code": "AAA",
                "station_name": "Alpha",
                "station_status_normalized": "departed",
                "arrival_is_observed": True,
                "departure_is_observed": True,
                "scheduled_arrival": "2026-09-06T10:00:00",
                "scheduled_departure": "2026-09-06T10:05:00",
                "actual_arrival": "2026-09-06T10:08:00",
                "actual_departure": "2026-09-06T10:12:00",
                "arrival_delay_min": 8,
                "platform": "1",
                "distance_from_source_km": 0.0,
            },
            {
                "halt_order": 2,
                "journey_status": "running",
                "station_code": "BBB",
                "station_name": "Beta",
                "station_status_normalized": "upcoming",
                "arrival_is_observed": False,
                "departure_is_observed": False,
                "scheduled_arrival": "2026-09-06T11:00:00",
                "scheduled_departure": "2026-09-06T11:05:00",
                "actual_arrival": None,
                "actual_departure": None,
                "arrival_delay_min": None,
                "platform": "2",
                "distance_from_source_km": 100.0,
            },
        ]
    )

    predictions = [
        {
            "station": {
                "code": "BBB",
                "stations_ahead": 1,
            },
            "forecast": {
                "eta": "2026-09-06T11:15:00+05:30",
                "predicted_delay_min": 15.0,
            },
        }
    ]

    result = build_journey_timeline(
        normalized_journey_df=df,
        predictions=predictions,
    )

    assert result["state"] == "RUNNING"
    assert len(result["stations"]) == 2

    first = result["stations"][0]
    assert first["station_code"] == "AAA"
    assert first["station_name"] == "Alpha"
    assert first["status"] == "PASSED"
    assert first["actual_arrival"] is not None
    assert first["actual_departure"] is not None
    assert first["delay_min"] == 8.0

    second = result["stations"][1]
    assert second["station_code"] == "BBB"
    assert second["status"] == "NEXT"
    assert second["predicted_arrival"] is not None
    assert second["delay_min"] == 15.0


def test_scheduled_journey_timeline_lists_all_stations():
    df = pd.DataFrame(
        [
            {
                "halt_order": 1,
                "journey_status": "not-started",
                "station_code": "AAA",
                "station_name": "Alpha",
                "station_status_normalized": "upcoming",
                "arrival_is_observed": False,
                "departure_is_observed": False,
                "scheduled_arrival": None,
                "scheduled_departure": "2026-09-06T22:50:00",
                "actual_arrival": None,
                "actual_departure": None,
                "arrival_delay_min": None,
                "platform": "1",
                "distance_from_source_km": 0.0,
            },
            {
                "halt_order": 2,
                "journey_status": "not-started",
                "station_code": "BBB",
                "station_name": "Beta",
                "station_status_normalized": "upcoming",
                "arrival_is_observed": False,
                "departure_is_observed": False,
                "scheduled_arrival": "2026-09-07T00:15:00",
                "scheduled_departure": "2026-09-07T00:20:00",
                "actual_arrival": None,
                "actual_departure": None,
                "arrival_delay_min": None,
                "platform": "2",
                "distance_from_source_km": 120.0,
            },
        ]
    )

    result = build_journey_timeline(
        normalized_journey_df=df,
        predictions=[],
    )

    assert result["state"] == "SCHEDULED_NOT_STARTED"
    assert len(result["stations"]) == 2
    assert all(
        station["status"] == "SCHEDULED"
        for station in result["stations"]
    )


def test_completed_journey_timeline_preserves_actual_times():
    df = pd.DataFrame(
        [
            {
                "halt_order": 1,
                "journey_status": "completed",
                "station_code": "AAA",
                "station_name": "Alpha",
                "station_status_normalized": "departed",
                "arrival_is_observed": True,
                "departure_is_observed": True,
                "scheduled_arrival": "2026-09-06T10:00:00",
                "scheduled_departure": "2026-09-06T10:05:00",
                "actual_arrival": "2026-09-06T10:10:00",
                "actual_departure": "2026-09-06T10:15:00",
                "arrival_delay_min": 10.0,
                "platform": "1",
                "distance_from_source_km": 0.0,
            }
        ]
    )

    result = build_journey_timeline(
        normalized_journey_df=df,
        predictions=[],
    )

    assert result["state"] == "COMPLETED"
    assert result["stations"][0]["status"] == "PASSED"
    assert result["stations"][0]["actual_arrival"] is not None
    assert result["stations"][0]["actual_departure"] is not None