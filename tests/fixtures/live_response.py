def build_live_response():
    return {
        "success": True,

        "system": {
            "name": "SIH 26028 Hybrid Dynamic ETA System",
            "architecture": {
                "next_station":
                    "Model 2 next-station CatBoost",
                "later_stations":
                    "Guarded residual Model 3",
                "provider_forecast_usage":
                    "comparison_only",
            },
            "leakage_safe": True,
        },

        "journey": {
            "journey_id":
                "12615_2026-09-01",
            "train_number":
                "12615",
            "train_name":
                "Test Train",

            "current_station_code":
                "ABC",
            "current_station_name":
                "Test Station",
            "current_observed_arrival":
                "2026-09-01T10:00:00+05:30",
            "current_delay_min":
                10.0,

            "observed_stations":
                5,
            "upcoming_stations":
                1,
            "state_source":
                "MODEL_2_LEAKAGE_SAFE_CURRENT_STATE",
        },

        "predictions": [
            {
                "station": {
                    "code": "XYZ",
                    "name": "Next Station",
                    "stations_ahead": 1,
                    "distance_km": 20.0,
                },

                "schedule": {
                    "arrival":
                        "2026-09-01T11:00:00+05:30",
                },

                "forecast": {
                    "eta":
                        "2026-09-01T11:10:00+05:30",
                    "predicted_delay_min":
                        10.0,
                    "delay_status":
                        "LATE",
                    "lower_eta":
                        "2026-09-01T10:50:00+05:30",
                    "upper_eta":
                        "2026-09-01T11:30:00+05:30",
                    "interval_radius_min":
                        20.0,
                    "confidence":
                        "HIGH",
                },

                "model": {
                    "prediction_engine":
                        "MODEL_2_NEXT_STATION",
                    "model2_prediction_min":
                        10.0,
                    "model3_prediction_min":
                        12.0,
                    "recent_delay_baseline_min":
                        9.0,
                    "fallback_used":
                        False,
                    "fallback_reason":
                        None,
                },

                "explanation":
                    "Test prediction.",

                "comparison_only": {
                    "provider_eta":
                        None,
                    "provider_delay_min":
                        None,
                },
            }
        ],

        "backend": {
            "provider_payload_cache":
                "MISS",
            "cache_ttl_seconds":
                180,
        },
    }