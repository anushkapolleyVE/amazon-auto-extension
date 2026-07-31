from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User

from app.schemas.history import HistoryCreate

from app.services.history_service import (
    add_history,
    list_history,
    get_pending_notifications,
    mark_notification_read,
)

router = APIRouter(
    prefix="/history",
    tags=["Monitoring History"],
)


@router.post("/")
def create_history(
    history: HistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return add_history(
        db,
        current_user,
        history,
    )


@router.get("/")
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_history(
        db,
        current_user,
    )


@router.get("/pending")
def get_pending(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_pending_notifications(
        db,
        current_user,
    )


@router.patch("/{history_id}/mark-read")
def mark_read(
    history_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = mark_notification_read(
        db,
        current_user,
        history_id,
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="History entry not found",
        )

    return entry