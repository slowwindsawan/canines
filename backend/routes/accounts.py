# ---------- Account Info Endpoints ----------

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app import models
from app.schemas import UserOut, UserUpdate
from app.config import SessionLocal
from app.dependecies import get_current_user

router = APIRouter(prefix="/account", tags=["Account"])

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/me", response_model=UserOut)
def get_my_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetch the logged-in user's account info (email, name, username, subscription info).
    """
    return current_user


@router.put("/me", response_model=UserOut)
def update_my_account(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update account info like name or email for the current user.
    """
    # Ensure email uniqueness
    if payload.email and payload.email != current_user.email:
        exists = db.query(models.User).filter(models.User.email == payload.email).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email already in use")

    # Apply updates
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user
