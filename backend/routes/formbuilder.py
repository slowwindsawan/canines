import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.config import SessionLocal
import uuid
from pydantic import BaseModel
from typing import Any
from app import models

router = APIRouter(prefix="", tags=["form_builder"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class OnboardingFormPayload(BaseModel):
    json_data: Any  # Accept dict or list

class OnboardingFormResponse(BaseModel):
    success: bool
    form: Any

    class Config:
        orm_mode = True

@router.post("/update-onboarding-form",  response_model=OnboardingFormResponse)
def save_or_update_onboarding_form(payload: OnboardingFormPayload, db: Session = Depends(get_db)):
    form = db.query(models.OnboardingForm).first()

    if form:
        form.json_data = payload.json_data
    else:
        form = models.OnboardingForm(
            id=str(uuid.uuid4()),
            json_data=payload.json_data
        )
        db.add(form)

    db.commit()
    db.refresh(form)

    return {
        "success": True,
        "form": form.json_data or []  # <-- include the json_data
    }

@router.get("/get-onboarding-form")
def get_onboarding_form(db: Session = Depends(get_db)):
    """
    Fetch the universal onboarding form.
    Returns an empty array if no row exists or json_data is null.
    """
    print("Onboarding form ",db.query(models.OnboardingForm).first().json_data)
    form = db.query(models.OnboardingForm).first()
    
    json_data = form.json_data if form and form.json_data is not None else []

    return {
        "success": True,
        "form": json_data
    }

