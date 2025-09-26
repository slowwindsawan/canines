from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime
import json

from app import models, schemas
from app.config import SessionLocal
from app.dependecies import get_current_user
from ai.openai_client import analyze_health_logs

router = APIRouter(prefix="/submissions", tags=["submissions"])


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class PaginatedSubmissionsOut(BaseModel):
    items: List[schemas.SubmissionOut]
    total: int
    page: int
    page_size: int
    total_pages: int

@router.get("/list", response_model=PaginatedSubmissionsOut)
def list_submissions(
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    q: Optional[str] = None,  # free-text search (name, email, dog breed)
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.OnboardingSubmission)

    # optional filters
    if status and status != "all":
        query = query.filter(models.OnboardingSubmission.status == status)
    if priority and priority != "all":
        query = query.filter(models.OnboardingSubmission.priority == priority)

    # simple free-text search across name, email, dog.breed
    if q:
        q_like = f"%{q.lower()}%"
        # join dog if needed to filter by breed — assuming relationship exists
        query = (
            query.join(models.Dog, models.OnboardingSubmission.dog_id == models.Dog.id)
            .filter(
                models.Dog.name.ilike(q_like)
                | models.User.email.ilike(q_like)
                | models.Dog.breed.ilike(q_like)
            )
        )

    total = query.count()
    items = (
        query.order_by(models.OnboardingSubmission.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Normalize symptoms if returned as list
    formatted_items = []
    for s in items:
        if isinstance(s.symptoms, list):
            s.symptoms = {"items": s.symptoms}
        formatted_items.append(schemas.SubmissionOut.from_orm_with_relations(s))

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedSubmissionsOut(
        items=formatted_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


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


# ----------------- Pydantic schemas for progress -----------------
class ProgressReportIn(BaseModel):
    id: str
    dogId: UUID
    date: str  # "YYYY-MM-DD"
    symptoms: Optional[List[str]] = []
    notes: Optional[str] = None
    improvementScore: Optional[int] = None


class PaginatedProgressOut(BaseModel):
    items: List[dict]
    total: int
    page: int
    page_size: int
    total_pages: int


def paginate_list(lst: List[dict], page: int, page_size: int) -> PaginatedProgressOut:
    total = len(lst)
    if page_size <= 0:
        page_size = 5
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    start = (page - 1) * page_size
    end = start + page_size
    items = lst[start:end]
    return PaginatedProgressOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ----------------- GET paginated progress -----------------
@router.get("/progress/{dog_id}", response_model=PaginatedProgressOut)
def get_progress(
    dog_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1, le=50),
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

    progress = dog.progress or []
    return paginate_list(progress, page=page, page_size=page_size)


# ----------------- Add a progress report (returns page 1) -----------------
@router.post("/progress/{dog_id}", response_model=PaginatedProgressOut)
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
    else:
        try:
            # Analyze only recent entries (last 8)
            if dog.progress:
                dog.health_summary = analyze_health_logs(json.dumps(dog.progress[-8:]))
        except Exception as e:
            print("Could not analyze the dog's health: ", e)

    # Build new entry and prepend
    new_entry = {
        "id": report.id,
        "dogId": str(report.dogId),
        "date": report.date,
        "symptoms": report.symptoms,
        "notes": report.notes,
        "improvement_score": report.improvementScore,
        "timestamp": datetime.utcnow().isoformat(),
    }

    dog.progress = [new_entry] + (dog.progress or [])
    db.commit()
    db.refresh(dog)

    # Return first page (small payload) so frontend can immediately show updated feed
    return paginate_list(dog.progress, page=1, page_size=5)
