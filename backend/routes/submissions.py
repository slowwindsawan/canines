from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app import models, schemas
from app.config import SessionLocal
from app.dependecies import get_current_user
from datetime import datetime
import uuid
from pydantic import BaseModel

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
    current_user: models.User = Depends(get_current_user),
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

    return [schemas.SubmissionOut.from_orm_with_relations(s) for s in submissions]


# ----------------- 2️⃣ Get submissions by filters -----------------
@router.post("/", response_model=List[schemas.SubmissionOut])
def get_submissions(
    submission_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
    dog_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.OnboardingSubmission)

    if submission_id:
        submission = query.filter(
            models.OnboardingSubmission.id == submission_id
        ).first()
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

    return [schemas.SubmissionOut.from_orm_with_relations(s) for s in submissions]


# ----------------- Pydantic schema for a progress entry -----------------
class ProgressReportIn(BaseModel):
    id: str
    dogId: UUID
    date: str  # "YYYY-MM-DD"
    symptoms: Optional[List[str]] = []
    notes: Optional[str] = None
    improvementScore: Optional[int] = None


# ----------------- Add a progress report -----------------
@router.post("/progress/{dog_id}", response_model=List[dict])
def add_progress_report(
    dog_id: UUID,
    report: ProgressReportIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    dog = (
        db.query(models.Dog)
        .filter(models.Dog.id == dog_id, models.Dog.owner_id == current_user.id)
        .first()
    )
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")

    if not dog.progress:
        dog.progress = []

    # Append new entry from frontend
    new_entry = {
        "id": report.id,
        "dogId": str(report.dogId),  # convert UUID to string
        "date": report.date,
        "symptoms": report.symptoms,
        "notes": report.notes,
        "improvement_score": report.improvementScore,
        "timestamp": datetime.utcnow().isoformat(),
    }
    dog.progress = dog.progress + [new_entry]
    db.commit()
    db.refresh(dog)

    return dog.progress
