import pandas as pd


INDIAN_TIMEZONE = "Asia/Kolkata"


def timestamp_to_indian_iso(
    value,
):
    timestamp = pd.to_datetime(
        value,
        utc=True,
        errors="coerce",
    )

    if pd.isna(timestamp):
        return None

    return timestamp.tz_convert(
        INDIAN_TIMEZONE
    ).isoformat()