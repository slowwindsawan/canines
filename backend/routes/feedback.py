from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.models import Feedback, User
from app.dependecies import get_current_user
from app.config import SessionLocal

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Save feedback ---
@router.post("/feedback")
def save_feedback(payload: dict, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user)):
    if not payload.get("message") or len(payload.get("message").strip()) < 10:
        raise HTTPException(status_code=400, detail="Message must be at least 10 characters.")
    
    feedback = Feedback(
        user_id=current_user.id if current_user else None,
        name=payload.get("name"),
        email=payload.get("email"),
        message=payload.get("message"),
        meta=payload.get("meta"),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return {"success": True, "id": str(feedback.id)}
