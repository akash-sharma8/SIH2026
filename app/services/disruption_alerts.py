from typing import Any


def _station(
    value: Any,
) -> dict[str, Any] | None:
    if not isinstance(
        value,
        dict,
    ):
        return None

    code = str(
        value.get("code")
        or value.get("stationCode")
        or ""
    ).strip()

    name = str(
        value.get("name")
        or value.get("stationName")
        or ""
    ).strip()

    if not code and not name:
        return None

    return {
        "code": code or None,
        "name": name or None,
    }


def build_disruption_alerts(
    provider_payload: dict[str, Any],
) -> list[dict[str, Any]]:
    data = provider_payload.get(
        "data",
        {},
    )

    if not isinstance(
        data,
        dict,
    ):
        return []

    exceptions = data.get(
        "exceptions",
        [],
    )

    if not isinstance(
        exceptions,
        list,
    ):
        return []

    alerts = []

    for exception in exceptions:
        if not isinstance(
            exception,
            dict,
        ):
            continue

        exception_type = str(
            exception.get("type")
            or ""
        ).strip().upper()

        if not exception_type:
            continue

        if exception_type == "DIVERTED":
            diverted = exception.get(
                "diverted",
                {},
            )

            if not isinstance(
                diverted,
                dict,
            ):
                diverted = {}

            from_station = _station(
                diverted.get("from")
            )

            to_station = _station(
                diverted.get("to")
            )

            skipped = diverted.get(
                "skippedStations",
                [],
            )

            affected_stations = []

            if isinstance(
                skipped,
                list,
            ):
                for item in skipped:
                    station = _station(
                        item
                    )

                    if station:
                        affected_stations.append(
                            station
                        )

            from_name = (
                from_station.get("name")
                if from_station
                else None
            )

            to_name = (
                to_station.get("name")
                if to_station
                else None
            )

            if from_name and to_name:
                message = (
                    "Train is diverted between "
                    f"{from_name} and "
                    f"{to_name}."
                )
            else:
                message = str(
                    exception.get("message")
                    or "Train route is diverted."
                )

            alerts.append(
                {
                    "type":
                        "DIVERTED",

                    "severity":
                        "CRITICAL",

                    "title":
                        "Train Diverted",

                    "message":
                        message,

                    "from_station":
                        from_station,

                    "to_station":
                        to_station,

                    "affected_stations":
                        affected_stations,

                    "source":
                        "RAILRADAR",
                }
            )


        if exception_type == "RESCHEDULED":
            rescheduled = exception.get(
                "rescheduled",
                {},
            )

            if not isinstance(
                rescheduled,
                dict,
            ):
                rescheduled = {}

            station = _station(
                rescheduled.get("station")
            )

            raw_delay = rescheduled.get(
                "delayMinutes"
            )

            try:
                delay_minutes = (
                    int(raw_delay)
                    if raw_delay is not None
                    else None
                )
            except (
                TypeError,
                ValueError,
            ):
                delay_minutes = None

            provider_message = str(
                exception.get("message")
                or ""
            ).strip()

            if provider_message:
                message = (
                    provider_message
                    .strip("[]")
                )
            elif (
                station
                and delay_minutes is not None
            ):
                message = (
                    "Train has been rescheduled "
                    f"from {station.get('name') or station.get('code')} "
                    f"by {delay_minutes} minutes."
                )
            else:
                message = (
                    "Train has been rescheduled."
                )

            alerts.append(
                {
                    "type":
                        "RESCHEDULED",

                    "severity":
                        "HIGH",

                    "title":
                        "Train Rescheduled",

                    "message":
                        message,

                    "from_station":
                        station,

                    "to_station":
                        None,

                    "affected_stations":
                        [],

                    "source":
                        "RAILRADAR",
                }
            )

        if exception_type in {
            "PARTIALLY_CANCELLED",
            "PARTIAL_CANCELLED",
        }:
            partial = (
                exception.get(
                    "partiallyCancelled"
            )
            or exception.get(
                "partially_cancelled"
            )
            or {}
            )

            if not isinstance(
                partial,
                dict,
            ):
                partial = {}

            from_station = _station(
                partial.get("from")
                or partial.get("fromStation")
            )

            to_station = _station(
                partial.get("to")
                or partial.get("toStation")
            )

            affected_raw = (
                partial.get("cancelledStations")
                or partial.get("affectedStations")
                or partial.get("skippedStations")
                or []
            )

            affected_stations = []

            if isinstance(
                affected_raw,
                list,
            ):
                for item in affected_raw:
                    station = _station(item)

                if station:
                    affected_stations.append(
                        station
                    )

            provider_message = str(
                exception.get("message")
                or ""
            ).strip()

            message = (
                provider_message.strip("[]")
                if provider_message
                else
                "Train is partially cancelled."
            )

            alerts.append(
            {
                "type":
                    "PARTIALLY_CANCELLED",

                "severity":
                    "CRITICAL",

                "title":
                    "Train Partially Cancelled",

                "message":
                    message,

                "from_station":
                    from_station,

                "to_station":
                    to_station,

                "affected_stations":
                    affected_stations,

                "source":
                    "RAILRADAR",
            }
        )

        if exception_type == "CANCELLED":
            provider_message = str(
                exception.get("message")
                or ""
            ).strip()

            message = (
                provider_message.strip("[]")
                if provider_message
                else
                "Train has been cancelled."
            )

            alerts.append(
                {
                    "type":
                        "CANCELLED",

                    "severity":
                        "CRITICAL",

                    "title":
                        "Train Cancelled",

                    "message":
                        message,

                    "from_station":
                        None,

                    "to_station":
                        None,

                    "affected_stations":
                        [],

                    "source":
                        "RAILRADAR",
                }
            )

    return alerts
