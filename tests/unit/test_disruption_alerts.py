from app.services.disruption_alerts import (
    build_disruption_alerts,
)


def test_builds_diversion_alert():
    payload = {
        "data": {
            "exceptions": [
                {
                    "type": "DIVERTED",
                    "message":
                        "[Train is Diverted between: "
                        "MANAK NAGAR(MKG) to MALHOUR(ML)]",
                    "diverted": {
                        "from": {
                            "code": "MKG",
                            "name": "MANAK NAGAR",
                        },
                        "to": {
                            "code": "ML",
                            "name": "MALHOUR",
                        },
                        "skippedStations": [
                            {
                                "code": "LKO",
                                "name": "Lucknow Jn",
                            }
                        ],
                    },
                }
            ]
        }
    }

    alerts = build_disruption_alerts(
        payload
    )

    assert len(alerts) == 1

    alert = alerts[0]

    assert alert["type"] == "DIVERTED"
    assert alert["severity"] == "CRITICAL"
    assert alert["title"] == "Train Diverted"

    assert (
        alert["from_station"]["code"]
        == "MKG"
    )

    assert (
        alert["to_station"]["code"]
        == "ML"
    )

    assert (
        alert["affected_stations"][0][
            "code"
        ]
        == "LKO"
    )


def test_returns_empty_list_when_no_exceptions():
    alerts = build_disruption_alerts(
        {
            "data": {
                "exceptions": []
            }
        }
    )

    assert alerts == []


def test_builds_rescheduled_alert():
    payload = {
        "data": {
            "exceptions": [
                {
                    "type": "RESCHEDULED",
                    "message": (
                        "[Train is Rescheduled, "
                        "Now it will start from "
                        "Train Source: NEW DELHI(NDLS) "
                        "at 14:00 06-Sep "
                        "(02:25 hrs. late) "
                        "(Tentative)]"
                    ),
                    "rescheduled": {
                        "station": {
                            "code": "NDLS",
                            "name": "NEW DELHI",
                            "sequence": 1,
                        },
                        "originalTime": "14:00",
                        "newTime": "06-Sep",
                        "delayMinutes": 145,
                    },
                }
            ]
        }
    }

    alerts = build_disruption_alerts(
        payload
    )

    assert len(alerts) == 1

    alert = alerts[0]

    assert (
        alert["type"]
        == "RESCHEDULED"
    )

    assert (
        alert["severity"]
        == "HIGH"
    )

    assert (
        alert["title"]
        == "Train Rescheduled"
    )

    assert (
        alert["from_station"]["code"]
        == "NDLS"
    )

    assert "02:25 hrs. late" in (
        alert["message"]
    )

def test_builds_partial_cancellation_alert():
    payload = {
        "data": {
            "exceptions": [
                {
                    "type":
                        "PARTIALLY_CANCELLED",
                    "message":
                        "[Train is partially cancelled]",
                    "partiallyCancelled": {
                        "from": {
                            "code": "AAA",
                            "name": "Station A",
                        },
                        "to": {
                            "code": "BBB",
                            "name": "Station B",
                        },
                        "cancelledStations": [
                            {
                                "code": "CCC",
                                "name": "Station C",
                            }
                        ],
                    },
                }
            ]
        }
    }

    alerts = build_disruption_alerts(
        payload
    )

    assert len(alerts) == 1
    assert (
        alerts[0]["type"]
        == "PARTIALLY_CANCELLED"
    )
    assert (
        alerts[0]["from_station"]["code"]
        == "AAA"
    )
    assert (
        alerts[0]["to_station"]["code"]
        == "BBB"
    )

def test_builds_cancelled_alert():
    payload = {
        "data": {
            "exceptions": [
                {
                    "type": "CANCELLED",
                    "message":
                        "[Train is Cancelled]",
                }
            ]
        }
    }

    alerts = build_disruption_alerts(
        payload
    )

    assert len(alerts) == 1

    alert = alerts[0]

    assert alert["type"] == "CANCELLED"
    assert alert["severity"] == "CRITICAL"
    assert alert["title"] == "Train Cancelled"
    assert (
        alert["message"]
        == "Train is Cancelled"
    )
    assert alert["from_station"] is None
    assert alert["to_station"] is None