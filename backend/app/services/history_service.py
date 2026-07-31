from sqlalchemy.orm import Session

from app.models.monitoring_history import MonitoringHistory
from app.models.user import User
from app.schemas.history import HistoryCreate


def add_history(
    db: Session,
    current_user: User,
    history: HistoryCreate,
):
    new_history = MonitoringHistory(
        user_id=current_user.id,
        product_id=history.product_id,
        event_type=history.status,
        description=history.message,
    )

    db.add(new_history)
    db.commit()
    db.refresh(new_history)

    return new_history


def list_history(
    db: Session,
    current_user: User,
):
    return (
        db.query(MonitoringHistory)
        .filter(
            MonitoringHistory.user_id == current_user.id
        )
        .order_by(
            MonitoringHistory.created_at.desc()
        )
        .all()
    )


def get_pending_notifications(
    db: Session,
    current_user: User,
):
    return (
        db.query(MonitoringHistory)
        .filter(
            MonitoringHistory.user_id == current_user.id,
            MonitoringHistory.notified == False,
        )
        .order_by(
            MonitoringHistory.created_at.desc()
        )
        .all()
    )


def mark_notification_read(
    db: Session,
    current_user: User,
    history_id,
):
    entry = (
        db.query(MonitoringHistory)
        .filter(
            MonitoringHistory.id == history_id,
            MonitoringHistory.user_id == current_user.id,
        )
        .first()
    )

    if not entry:
        return None

    entry.notified = True
    db.commit()
    db.refresh(entry)

    return entry