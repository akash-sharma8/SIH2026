from fastapi import (
    APIRouter,
    Depends,
)

from app.core.staff_auth import (
    StaffIdentity,
    require_staff,
)


router = APIRouter(
    prefix="/staff",
    tags=["staff"],
)


@router.get("/me")
def get_staff_identity(
    staff: StaffIdentity = Depends(
        require_staff
    ),
):
    return {
        "success": True,
        "staff": {
            "role": staff.role,
            "station_code": (
                staff.station_code
            ),
        },
    }