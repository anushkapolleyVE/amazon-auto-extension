from uuid import UUID
from sqlalchemy.orm import Session

from app.models.tracked_products import TrackedProduct
from app.models.monitoring_history import MonitoringHistory
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate



def create_product(
    db: Session,
    current_user: User,
    product: ProductCreate,
):
    new_product = TrackedProduct(
        user_id=current_user.id,
        product_url=str(product.product_url),
        product_title=product.product_title,
        last_price=product.last_price,
        availability=product.availability,
        target_price=product.target_price,
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return new_product


def get_products(
    db: Session,
    current_user: User,
):
    return (
        db.query(TrackedProduct)
        .filter(
            TrackedProduct.user_id == current_user.id
        )
        .all()
    )


def get_product(
    db: Session,
    current_user: User,
    product_id: UUID,
):
    return (
        db.query(TrackedProduct)
        .filter(
            TrackedProduct.id == product_id,
            TrackedProduct.user_id == current_user.id,
        )
        .first()
    )


def _check_and_notify(db: Session, current_user: User, product: TrackedProduct):
    """Check if price/stock conditions are met and log an unnotified history entry."""
    condition_met = False
    reason = None

    if product.target_price and product.last_price:
        try:
            if float(product.last_price) <= float(product.target_price):
                condition_met = True
                reason = f"Price dropped to {product.last_price} (target: {product.target_price})"
        except ValueError:
            pass

    if product.availability and product.availability.strip().lower() == "in stock":
        if not condition_met:
            condition_met = True
            reason = "Product is back in stock"

    if condition_met:
        history_entry = MonitoringHistory(
            user_id=current_user.id,
            product_id=product.id,
            event_type="condition_met",
            description=reason,
            notified=False,
        )
        db.add(history_entry)
        db.commit()


def update_product(
    db: Session,
    current_user: User,
    product_id: UUID,
    product_update: ProductUpdate,
):
    product = (
        db.query(TrackedProduct)
        .filter(
            TrackedProduct.id == product_id,
            TrackedProduct.user_id == current_user.id,
        )
        .first()
    )

    if not product:
        return None

    update_data = product_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    _check_and_notify(db, current_user, product)

    db.refresh(product)  # ← re-sync after _check_and_notify's internal commit expired it

    return product


def delete_product(
    db: Session,
    current_user: User,
    product_id: UUID,
):
    product = (
        db.query(TrackedProduct)
        .filter(
            TrackedProduct.id == product_id,
            TrackedProduct.user_id == current_user.id,
        )
        .first()
    )

    if not product:
        return None

    db.delete(product)
    db.commit()

    return True