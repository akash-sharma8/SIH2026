from app.schemas.responses import (
    LiveForecastResponse,
)


def test_live_response_has_weather_corridor_field():
    field = (
        LiveForecastResponse
        .model_fields
        .get("weather_corridor")
    )

    assert field is not None


def test_live_response_accepts_eta_weather_corridor():
    payload = {
        "success": True,

        "system": {
            "name": "RailETA",
            "version": "test",
            "architecture": {
                "next_station": "Model2 CatBoost",
                "later_stations": "Model3 Residual CatBoost",
                "provider_forecast_usage": "TEST",
            },
            "mode": "live",
            "leakage_safe": True,
        },

        "journey": {
            "journey_id": "12615-test",

            "train_number": "12615",
            "train_name": "Test Train",

            "current_station_code": "AMLA",
            "current_station_name": "Amla Jn",

            "current_observed_arrival":
                "2026-09-03T13:30:00+05:30",

            "current_delay_min": 10.0,

            "observed_stations": 5,
            "upcoming_stations": 1,

            "state_source": "TEST",
        },

        "predictions": [],

        "eta_weather_corridor": [
            {
                "station_code": "ET",
                "station_name": "Itarsi Jn",

                "predicted_eta":
                    "2026-09-03T17:00:00+05:30",

                "forecast_time":
                    "2026-09-03T18:00:00+05:30",

                "weather": {
                    "station_code": "ET",
                    "station_name": "Itarsi Jn",

                    "latitude": 22.6085,
                    "longitude": 77.7670,

                    "temperature_c": 24.5,
                    "condition": "moderate rain",

                    "precipitation_probability_pct": 82.0,
                    "visibility_km": 3.0,
                    "wind_kph": 14.4,
                    "humidity_pct": 88.0,

                    "risk_level": "HIGH",

                    "source":
                        "OPENWEATHER_FORECAST",
                },

                "time_difference_minutes": 60.0,

                "source":
                    "OPENWEATHER_5DAY_3H",
            }
        ],
    }

    response = LiveForecastResponse(
        **payload
    )

    assert (
        len(
            response
            .eta_weather_corridor
        )
        == 1
    )

    assert (
        response
        .eta_weather_corridor[0]
        .station_code
        == "ET"
    )

    assert (
        response
        .eta_weather_corridor[0]
        .weather
        .risk_level
        == "HIGH"
    )