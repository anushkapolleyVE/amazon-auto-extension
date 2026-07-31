from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
)
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.auth_service import (
    register_user,
    login_user,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/register")
def signup(user: RegisterRequest, db: Session = Depends(get_db)):
    try:
        new_user = register_user(db, user)

        return {
            "message": "User registered successfully",
            "id": str(new_user.id),
        }

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.post("/login")
def login(user: LoginRequest, db: Session = Depends(get_db)):
    try:
        return login_user(db, user)

    except ValueError as e:
        raise HTTPException(
            status_code=401,
            detail=str(e),
        )
