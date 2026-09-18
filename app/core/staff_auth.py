from dataclasses import dataclass
from typing import Literal

from fastapi import (
    Header,
    HTTPException,
    status,
)

from app.core.config import get_settings


StaffRole = Literal[
    "STATION_STAFF",
    "CONTROL_ROOM",
]


@dataclass(frozen=True)
class StaffIdentity:
    role: StaffRole
    station_code: str | None = None


def require_staff(
    x_staff_api_secret: str | None = Header(
        default=None,
        alias="X-Staff-API-Secret",
    ),
    x_staff_role: str | None = Header(
        default=None,
        alias="X-Staff-Role",
    ),
    x_station_code: str | None = Header(
        default=None,
        alias="X-Station-Code",
    ),
) -> StaffIdentity:
    settings = get_settings()

    expected_secret = (
        settings.staff_api_secret.strip()
    )

    if not expected_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Staff API authorization is not configured.",
        )

    if (
        not x_staff_api_secret
        or x_staff_api_secret
        != expected_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff authorization.",
        )

    if x_staff_role not in {
        "STATION_STAFF",
        "CONTROL_ROOM",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid staff role.",
        )

    if (
        x_staff_role == "STATION_STAFF"
        and not x_station_code
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Station staff requires a station code.",
        )

    return StaffIdentity(
        role=x_staff_role,
        station_code=(
            x_station_code.strip().upper()
            if x_station_code
            else None
        ),
    )