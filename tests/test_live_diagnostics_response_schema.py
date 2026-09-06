from app.schemas.responses import (
    LiveForecastResponse,
)


def test_live_response_accepts_empty_diagnostics():
    payload = {
        "success": True,

        "system": {
            "name": "RailETA",
            "version": "test",
            "architecture": {
                "next_station": "Model2",
                "later_stations": "Model3",
                "provider_forecast_usage": "TEST",
            },
            "mode": "live",
            "leakage_safe": True,
        },

        "journey": {
            "journey_id": "test-journey",
            "train_number": "12615",
            "train_name": "Test Train",
            "current_station_code": "SEGM",
            "current_station_name": "Sevagram",
            "current_observed_arrival":
                "2026-09-03T10:00:00+05:30",
            "current_delay_min": 20.0,
            "observed_stations": 10,
            "upcoming_stations": 5,
            "state_source": "TEST",
        },

        "predictions": [],

        "diagnostics": {
            "prediction_explanation": None,
            "evaluation": None,
        },
    }

    response = LiveForecastResponse(
        **payload
    )

    assert response.diagnostics is not None
    assert (
        response.diagnostics
        .prediction_explanation
        is None
    )
    assert (
        response.diagnostics
        .evaluation
        is None
    )