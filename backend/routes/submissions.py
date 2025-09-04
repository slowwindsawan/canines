from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app import models, schemas
from app.config import SessionLocal
from app.dependecies import get_current_user

router = APIRouter(prefix="/submissions", tags=["submissions"])

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----------------- 1️⃣ Get latest submissions -----------------
@router.post("/latest", response_model=List[schemas.SubmissionOut])
def get_latest_submissions(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    submissions = (
        db.query(models.OnboardingSubmission)
        .order_by(models.OnboardingSubmission.created_at.desc())
        .limit(limit)
        .all()
    )

    # Normalize symptoms to dict if it's a list
    for s in submissions:
        if isinstance(s.symptoms, list):
            s.symptoms = {"items": s.symptoms}

    return [
        schemas.SubmissionOut.from_orm_with_relations(s) for s in submissions
    ]


# ----------------- 2️⃣ Get submissions by filters -----------------
@router.post("/", response_model=List[schemas.SubmissionOut])
def get_submissions(
    submission_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
    dog_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.OnboardingSubmission)

    if submission_id:
        submission = query.filter(models.OnboardingSubmission.id == submission_id).first()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        submissions = [submission]
    else:
        if user_id:
            query = query.filter(models.OnboardingSubmission.user_id == user_id)
        if dog_id:
            query = query.filter(models.OnboardingSubmission.dog_id == dog_id)

        submissions = query.all()
        if not submissions:
            raise HTTPException(status_code=404, detail="No submissions found")

    # Normalize symptoms to dict if it's a list
    for s in submissions:
        if isinstance(s.symptoms, list):
            s.symptoms = {"items": s.symptoms}

    return [
        schemas.SubmissionOut.from_orm_with_relations(s) for s in submissions
    ]