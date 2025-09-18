from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body, Request
from sqlalchemy.orm import Session
from app.config import SessionLocal
from sqlalchemy import func
from app import models, schemas
from app.dependecies import get_current_user  # assuming you have JWT auth
from sqlalchemy.exc import IntegrityError
import uuid
from typing import Any, Dict, List, Optional
from ai.openai import call_gpt_chat
from datetime import datetime, date
from typing import List, Optional, Dict
from uuid import UUID
from pydantic import BaseModel
import os
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from botocore.client import Config
from uuid import uuid4
from dotenv import load_dotenv
import json

# Load .env from parent directory
load_dotenv()

router = APIRouter(prefix="/dogs", tags=["dogs"])


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def merge_form_and_user_data_for_ai(form_structure, user_data):
    form_lookup = {f["name"]: f for f in form_structure}

    final_json = []
    final_string_lines = []

    for user_field in user_data:
        field_name = user_field.get("name")
        merged_field = {
            "field_name": field_name,
            "user_filled_value": user_field.get("value"),
            "label": user_field.get("label"),
        }

        if field_name in form_lookup:
            form_field = form_lookup[field_name]
            if "aiText" in form_field:
                merged_field["aiText"] = form_field["aiText"]
            for key in ["options", "min", "max", "maxLength"]:
                if key in user_field:
                    merged_field[key] = user_field[key]
        else:
            # Include any extra keys from user_field if relevant
            for key in ["options", "min", "max", "maxLength"]:
                if key in user_field:
                    merged_field[key] = user_field[key]

        final_json.append(merged_field)

        # Build human-readable string
        lines = [
            f"Field: {merged_field.get('label', field_name)}",
            f"User value: {merged_field.get('user_filled_value')}",
        ]
        if "aiText" in merged_field:
            lines.append(f"Description: {merged_field['aiText']}")
        lines.append("---")
        final_string_lines.append("\n".join(lines))

    final_string = "\n".join(final_string_lines)

    return final_json, final_string

def add_activity(activities: Optional[List[Dict]], new_activity: Dict) -> List[Dict]:
    """
    Adds a new activity to the list, keeping at most 5 items.
    If activities is None, initializes it as an empty list.

    Each activity is a dict with: title, timestamp, description, type
    """
    if activities is None:
        activities = []

    # Convert datetime to ISO string if needed
    if isinstance(new_activity.get("timestamp"), datetime):
        new_activity["timestamp"] = new_activity["timestamp"].isoformat()

    activities.append(new_activity)

    # Keep only the last 5 items
    if len(activities) > 5:
        activities = activities[-5:]

    return activities

@router.post("/create-dog")
def create_dog(
    dog: Dict[str, Any] = Body(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept raw dict body. We coerce/validate common fields and then run the
    original creation flow. This is defensive: accepts strings for dates/floats,
    treats missing form_data gracefully, and logs minimal debug info.
    """
    try:
        # --- raw payload inspections (useful in logs) ---
        # print("create_dog payload:", dog)  # uncomment if you want server logs

        # --- required field: name ---
        name_raw = dog.get("name", "") or ""
        if not isinstance(name_raw, str):
            name_raw = str(name_raw or "")
        name_clean = name_raw.strip()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Dog name is required."
            )

        # --- uniqueness check (case-insensitive) ---
        existing = (
            db.query(models.Dog)
            .filter(
                models.Dog.owner_id == current_user.id,
                func.lower(models.Dog.name) == name_clean.lower(),
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A dog with this name already exists for this account. Choose a different name.",
            )

        # --- helper coercions ---
        def coerce_date(val) -> Optional[date]:
            if val is None:
                return None
            if isinstance(val, date) and not isinstance(val, datetime):
                return val
            if isinstance(val, datetime):
                return val.date()
            if isinstance(val, (int, float)):
                # treat as timestamp (seconds)
                try:
                    return datetime.fromtimestamp(int(val)).date()
                except Exception:
                    return None
            if isinstance(val, str):
                v = val.strip()
                if v == "" or v.lower() == "null":
                    return None
                # try common formats
                for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S"):
                    try:
                        return datetime.strptime(v, fmt).date()
                    except Exception:
                        continue
                # fallback to fromisoformat
                try:
                    return datetime.fromisoformat(v).date()
                except Exception:
                    return None
            return None

        def coerce_float(val) -> Optional[float]:
            if val is None:
                return None
            if isinstance(val, (int, float)):
                return float(val)
            if isinstance(val, str):
                v = val.strip()
                if v == "" or v.lower() == "null":
                    return None
                try:
                    return float(v)
                except Exception:
                    return None
            return None

        # --- coerce/normalize top-level fields ---
        dob = coerce_date(dog.get("date_of_birth") or dog.get("dob"))
        weight_kg = coerce_float(dog.get("weight_kg") or dog.get("weight"))
        breed = dog.get("breed")
        sex = dog.get("sex")
        notes = dog.get("notes") or dog.get("behaviorNotes") or ""

        # --- form_data normalization ---
        form_data_raw = dog.get("form_data", {}) or {}
        # If client sent a JSON string for form_data, attempt to parse it
        if isinstance(form_data_raw, str):
            try:
                form_data_raw = json.loads(form_data_raw)
            except Exception:
                # leave as string in form_data; downstream code may expect dict though
                form_data_raw = {"raw": form_data_raw}

        if not isinstance(form_data_raw, dict):
            # try to coerce list-of-kv into dict (common mistake)
            try:
                # if they sent [{"key":"k","value":"v"}, ...]
                fd = {}
                if isinstance(form_data_raw, list):
                    for item in form_data_raw:
                        if isinstance(item, dict) and "key" in item:
                            fd[item["key"]] = item.get("value")
                if fd:
                    form_data_raw = fd
                else:
                    # fallback: store as wrapper
                    form_data_raw = {"_raw": form_data_raw}
            except Exception:
                form_data_raw = {"_raw": form_data_raw}

        # Extract user_data for AI function (maintains old expectation)
        user_data = form_data_raw.get("fullFormFields") or []

        # If DB form structure exists, fetch it safely
        onboarding_row = db.query(models.OnboardingForm).first()
        dog_form_structure = (onboarding_row.json_data if onboarding_row else None) or []

        # --- Merge for AI processing (keeps your existing function) ---
        merged_data, merged_string = merge_form_and_user_data_for_ai(
            dog_form_structure, user_data
        )

        # --- Generate AI fields (your functions remain the same) ---
        generated_overview = call_gpt_chat(merged_string, "overview")
        generated_protocol = call_gpt_chat(merged_string, "protocol")

        # --- Activities: coerce existing activities to list then add our activity ---
        activities_input = dog.get("activities") or form_data_raw.get("activities") or []
        if not isinstance(activities_input, list):
            activities_input = [activities_input]

        activities = add_activity(
            activities_input,
            {
                "title": "Requested doctor for diagnosis",
                "timestamp": datetime.now(),
                "description": "Requested a veterinary consultation for diagnosis.",
                "type": "consultation",
            },
        )

        # --- Build final form_data JSON to store ---
        # prefer explicit weight_kg, otherwise keep what was in form_data
        if weight_kg is not None:
            form_data_raw["weight_kg"] = weight_kg

        if notes:
            form_data_raw["behaviorNotes"] = notes
        else:
            form_data_raw.setdefault("behaviorNotes", form_data_raw.get("behaviorNotes", ""))

        # copy some fields if present at top-level
        if "age" in dog and dog["age"] is not None:
            form_data_raw.setdefault("age", dog["age"])
        if "stoolType" in dog and dog["stoolType"] is not None:
            form_data_raw.setdefault("stoolType", dog["stoolType"])
        if "symptoms" in dog and dog["symptoms"] is not None:
            form_data_raw.setdefault("symptoms", dog["symptoms"])

        # --- Persist Dog record ---
        new_dog = models.Dog(
            owner_id=current_user.id,
            name=name_clean,
            breed=breed,
            sex=sex,
            date_of_birth=dob,
            weight_kg=weight_kg,
            notes=notes or form_data_raw.get("behaviorNotes", ""),
            form_data=form_data_raw,
            overview=generated_overview,
            protocol=generated_protocol,
            activities=activities,
            status="in_review",
        )

        db.add(new_dog)
        db.commit()
        db.refresh(new_dog)

        # --- create corresponding submission (same as before) ---
        submission = models.OnboardingSubmission(
            user_id=current_user.id,
            dog_id=new_dog.id,
            behaviour_note=form_data_raw.get("behaviorNotes", ""),
            status="pending",
            symptoms=form_data_raw.get("symptoms"),
            confidence=None,
            diagnosis=None,
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)

        return {
            "success": True,
            "message": "Dog created successfully",
            "dog": {
                "id": str(new_dog.id),
                "name": new_dog.name,
                "breed": new_dog.breed,
                "sex": new_dog.sex,
                "date_of_birth": new_dog.date_of_birth,
                "weight_kg": new_dog.weight_kg,
                "notes": new_dog.notes,
                "form_data": new_dog.form_data,
                "overview": new_dog.overview,
                "protocol": new_dog.protocol,
                "activities": new_dog.activities,
                "status": new_dog.status,
            },
        }

    except IntegrityError as ie:
        db.rollback()
        print("create_dog IntegrityError:", ie)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database integrity error creating dog.",
        )
    except HTTPException:
        # re-raise HTTPExceptions (e.g., conflict or bad request)
        raise
    except Exception as e:
        db.rollback()
        print("create_dog unexpected error:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating dog.",
        )

@router.post("/get-dogs")
def get_dogs(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    try:
        dogs = db.query(models.Dog).filter(models.Dog.owner_id == current_user.id).all()
        return {
            "success": True,
            "dogs": [
                {
                    "id": str(d.id),
                    "name": d.name,
                    "breed": d.breed,
                    "sex": d.sex,
                    "date_of_birth": d.date_of_birth,
                    "weight_kg": d.weight_kg,
                    "notes": d.notes,
                }
                for d in dogs
            ],
        }
    except Exception as e:
        return {"success": False, "message": "Error fetching dogs"}


# --- Get a single dog by ID ---
@router.post("/get/{dog_id}")
def get_dog_by_id(
    dog_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    dog = (
        db.query(models.Dog)
        .filter(
            models.Dog.id == uuid.UUID(dog_id), models.Dog.owner_id == current_user.id
        )
        .first()
    )
    if not dog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dog not found"
        )
    return {
        "success": True,
        "dog": {
            "id": str(dog.id),
            "name": dog.name,
            "breed": dog.breed,
            "sex": dog.sex,
            "date_of_birth": dog.date_of_birth,
            "weight_kg": dog.weight_kg,
            "notes": dog.notes,
            "form_data": dog.form_data,
            "protocol": dog.protocol,
            "overview": dog.overview,
            "progress": dog.progress,
            "image_url": dog.image_url
        },
    }


# --- Update a dog by ID ---
@router.put("/update/{dog_id}")
def update_dog_by_id(
    dog_id: str,
    dog_update: schemas.DogUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    dog = (
        db.query(models.Dog)
        .filter(
            models.Dog.id == uuid.UUID(dog_id), models.Dog.owner_id == current_user.id
        )
        .first()
    )
    user_data = dog.form_data["fullFormFields"] or []
    dog_form_structure = db.query(models.OnboardingForm).first().json_data or []
    # Merge form and user data for AI processing
    merged_data, merged_string = merge_form_and_user_data_for_ai(
        dog_form_structure, user_data
    )
    if not dog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dog not found"
        )

    # Merge form_data
    form_data: Dict[str, Any] = dog.form_data.copy() if dog.form_data else {}
    if dog_update.form_data:
        form_data.update(dog_update.form_data)

    # Handle top-level fields
    dog.name = dog_update.name.strip() if dog_update.name else dog.name
    dog.breed = dog_update.breed or dog.breed
    dog.sex = dog_update.sex or dog.sex
    dog.date_of_birth = dog_update.date_of_birth or dog.date_of_birth
    dog.weight_kg = dog_update.weight_kg or dog.weight_kg
    dog.notes = dog_update.notes or form_data.get("behaviorNotes", dog.notes)
    dog.form_data = form_data

    try:
        if "admin" not in dog_update.__dict__ or not dog_update.admin:
            activities = add_activity(
                dog.activities,
                {
                    "title": "Meals plans and Protocols updated.",
                    "timestamp": datetime.now(),
                    "description": "Doctor has made some changes in your pet's Meals plans and Protocols.",
                    "type": "consultation",
                },
            )
            generated_overview = call_gpt_chat(merged_string, "overview")
            generated_protocol = call_gpt_chat(merged_string, "protocol")
            dog.overview = generated_overview
            dog.protocol = generated_protocol
            dog.status = "in_review"
        else:
            dog.protocol = dog_update.__dict__["protocol"]
            dog.overview = dog_update.__dict__["overview"]
            activities = add_activity(
                dog.activities,
                {
                    "title": "Requested doctor for reassessment",
                    "timestamp": datetime.now(),
                    "description": "Requested a veterinary consultation for reassessment.",
                    "type": "consultation",
                },
            )
        dog.activities = activities
        db.commit()
        db.refresh(dog)

        # --- create corresponding submission ---
        submission = models.OnboardingSubmission(
            user_id=current_user.id,
            dog_id=dog.id,
            behaviour_note=form_data.get("behaviorNotes", ""),
            status="pending",
            symptoms=form_data.get("symptoms"),
            diagnosis=None,
            confidence=dog.protocol.get("confidence", 0) if isinstance(dog.protocol, dict) else 0
        )
        
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return {
            "success": True,
            "message": "Dog created successfully",
            "dog": {
                "id": str(dog.id),
                "name": dog.name,
                "breed": dog.breed,
                "sex": dog.sex,
                "date_of_birth": dog.date_of_birth,
                "weight_kg": dog.weight_kg,
                "notes": dog.notes,
                "form_data": dog.form_data,
                "overview": dog.overview,
                "protocol": dog.protocol,
                "activities": activities,
                "status": dog.status
            },
        }
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database integrity error updating dog",
        )
    except Exception as e:
        db.rollback()
        print("update_dog_by_id error:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating dog",
        )


# --- Delete a dog by ID ---
@router.delete("/delete/{dog_id}")
def delete_dog_by_id(
    dog_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    dog = (
        db.query(models.Dog)
        .filter(models.Dog.id == dog_id, models.Dog.owner_id == current_user.id)
        .first()
    )
    if not dog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dog not found"
        )
    try:
        db.delete(dog)
        db.commit()
        return {"success": True, "message": "Dog deleted successfully"}
    except Exception as e:
        db.rollback()
        print("delete_dog_by_id error:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting dog",
        )

class DogStatusUpdate(schemas.BaseModel):
    status: str  # e.g., "in_review", "approved", "rejected"


@router.put("/update-status/{dog_id}")
def update_dog_status(
    dog_id: str,
    status_update: DogStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    dog = (
        db.query(models.Dog)
        .filter(models.Dog.id == uuid.UUID(dog_id), models.Dog.owner_id == current_user.id)
        .first()
    )
    if not dog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dog not found"
        )

    try:
        # Update dog status
        dog.status = status_update.status

        # Fetch the latest submission
        submission = (
            db.query(models.OnboardingSubmission)
            .filter(
                models.OnboardingSubmission.dog_id == dog.id,
                models.OnboardingSubmission.user_id == current_user.id,
            )
            .order_by(models.OnboardingSubmission.created_at.desc())
            .first()
        )

        if submission:
            # Update latest submission
            submission.status = status_update.status

            # Fetch previous submissions with 'pending' status
            previous_pending = (
                db.query(models.OnboardingSubmission)
                .filter(
                    models.OnboardingSubmission.dog_id == dog.id,
                    models.OnboardingSubmission.user_id == current_user.id,
                    models.OnboardingSubmission.id != submission.id,  # exclude latest
                    models.OnboardingSubmission.status == "pending",
                )
                .all()
            )

            # Mark previous pending submissions as rejected
            for prev in previous_pending:
                prev.status = "rejected"

        # Add dog activity log (prepend, keep latest only)
        dog.activities = [
            {
                "title": "Diagnosis updated/created",
                "timestamp": datetime.now().isoformat(),
                "description": f"Your dog's diagnosis has been created/updated by the doctor.",
                "type": "status_update",
            }
        ] + (dog.activities or [])
        dog.activities = dog.activities[:10]  # keep max 10

        # -------- Update AdminSettings.activities -------- #
        admin_settings = db.query(models.AdminSettings).first()
        if not admin_settings:
            admin_settings = models.AdminSettings(admin_id=current_user.id, activities=[])
            db.add(admin_settings)

        admin_activities = admin_settings.activities or []
        new_admin_activity = {
            "dog_id": str(dog.id),
            "user_id": str(current_user.id),
            "status": status_update.status,
            "timestamp": datetime.now().isoformat(),
            "message": f"Dog '{dog.name}' status updated to '{status_update.status}'.",
        }

        admin_activities = [new_admin_activity] + admin_activities
        admin_settings.activities = admin_activities[:10]  # max 10

        admin_settings.admin_id = current_user.id  # track who last updated

        db.commit()
        db.refresh(dog)
        db.refresh(admin_settings)
        db.refresh(submission)

        return {
            "success": True,
            "message": f"Dog status updated to '{status_update.status}'",
            "dog": {
                "id": str(dog.id),
                "name": dog.name,
                "status": dog.status,
                "activities": dog.activities,
            },
            "submission": {
                "id": str(submission.id) if submission else None,
                "status": submission.status if submission else None,
            }
            if submission
            else None,
            "admin_settings": {
                "id": str(admin_settings.id),
                "last_updated_by": str(admin_settings.admin_id),
                "activities": admin_settings.activities,
            },
        }

    except Exception as e:
        db.rollback()
        print("update_dog_status error:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating dog status",
        )
    
class DogUpdateByPayload(BaseModel):
    id: UUID
    name: Optional[str] = None
    breed: Optional[str] = None
    sex: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None
    form_data: Optional[Dict[str, Any]] = None
    overview: Optional[Dict[str, Any]] = None
    protocol: Optional[Dict[str, Any]] = None
    activities: Optional[List[Dict[str, Any]]] = None
    admin: Optional[bool] = None
    status: Optional[str] = None
    progress: Optional[Any] = None

    class Config:
        orm_mode = True

@router.put("/update-by-payload")
def update_dog_by_payload(
    payload: DogUpdateByPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    dog = (
        db.query(models.Dog)
        .filter(models.Dog.id == payload.id, models.Dog.owner_id == current_user.id)
        .first()
    )
    if not dog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dog not found")

    # safe read & merge form_data (shallow merge)
    form_data: Dict[str, Any] = dog.form_data.copy() if dog.form_data else {}
    if payload.form_data:
        form_data.update(payload.form_data)
    dog.form_data = form_data

    # apply top-level fields (use payload values when provided)
    dog.name = payload.name.strip() if payload.name else dog.name
    dog.breed = payload.breed or dog.breed
    dog.sex = payload.sex or dog.sex
    dog.date_of_birth = payload.date_of_birth or dog.date_of_birth
    dog.weight_kg = payload.weight_kg or dog.weight_kg
    dog.notes = payload.notes or form_data.get("behaviorNotes", dog.notes)

    # overwrite overview/protocol/progress only if provided in payload
    if payload.overview is not None:
        dog.overview = payload.overview
    if payload.protocol is not None:
        dog.protocol = payload.protocol
    if payload.progress is not None:
        dog.progress = payload.progress
    if payload.status is not None:
        dog.status = payload.status

    existing_activities = dog.activities or []

    try:
        # create appropriate activity (no AI calls)
        if getattr(payload, "admin", False):
            activities = add_activity(
                existing_activities,
                {
                    "title": "Requested doctor for reassessment",
                    "timestamp": datetime.utcnow(),
                    "description": "Requested a veterinary consultation for reassessment.",
                    "type": "consultation",
                },
            )
            dog.status = "in_review"
        else:
            activities = add_activity(
                existing_activities,
                {
                    "title": "Meals plans and Protocols updated.",
                    "timestamp": datetime.utcnow(),
                    "description": "Doctor has made some changes in your pet's Meals plans and Protocols.",
                    "type": "consultation",
                },
            )

        # if client supplied activities, append them
        if payload.activities:
            activities = activities + payload.activities

        dog.activities = activities

        db.commit()
        db.refresh(dog)

        # create corresponding submission
        submission = models.OnboardingSubmission(
            user_id=current_user.id,
            dog_id=dog.id,
            behaviour_note=form_data.get("behaviorNotes", ""),
            status="pending",
            symptoms=form_data.get("symptoms"),
            confidence=None,
            diagnosis=None,
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)

        return {
            "success": True,
            "message": "Dog updated successfully",
            "dog": {
                "id": str(dog.id),
                "name": dog.name,
                "breed": dog.breed,
                "sex": dog.sex,
                "date_of_birth": dog.date_of_birth,
                "weight_kg": dog.weight_kg,
                "notes": dog.notes,
                "form_data": dog.form_data,
                "overview": dog.overview,
                "protocol": dog.protocol,
                "activities": dog.activities,
                "status": dog.status,
                "progress": dog.progress,
            },
            "submission_id": str(submission.id),
        }

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database integrity error updating dog",
        )
    except Exception as e:
        db.rollback()
        print("update_dog_by_payload error:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error updating dog"
        )
    
def get_r2_client():
    return boto3.client(
        "s3",
        region_name="auto",  # Dummy region, required
        aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
        endpoint_url=os.getenv("R2_ENDPOINT"),  # https://<account_id>.r2.cloudflarestorage.com
        config=Config(signature_version="s3v4"),  # ✅ Force correct signing
    )

def build_r2_public_url(key: str):
    # Prefer explicit public base if provided
    base = os.getenv("R2_PUBLIC_BASE_URL")
    if base:
        return f"{os.getenv("R2_PUBLIC_DEV")}/{key}"
    # fallback to {bucket}.{account}.r2.cloudflarestorage.com pattern
    bucket = os.getenv("R2_BUCKET")
    account = os.getenv("R2_ACCOUNT_ID")
    if bucket and account:
        return f"https://{bucket}.{account}.r2.cloudflarestorage.com/{key}"
    # final fallback - return key only
    return key

@router.post("/image")
async def upload_dog_image(
    image: UploadFile = File(...),
    id: Optional[str] = Form(None),  # optional dog id (string UUID)
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Upload a dog photo to Cloudflare R2.
    - `image` : multipart file
    - `id` (optional) : UUID of existing dog (if present, the dog record will be updated)
    Returns { success: True, url: <public url>, dog_id?: <id> }
    """
    # Basic validations
    ALLOWED_TYPES = {
        "image/jpeg",
        "image/jpg",     # alias
        "image/png",
        "image/webp",
        "image/gif",
        "image/pjpeg",   # some browsers use this
        "application/octet-stream",  # fallback for misreported
    }

    MAX_BYTES = 8 * 1024 * 1024  # 8 MB, change as needed

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {image.content_type}"
        )

    # read the file into memory up to the limit (we'll stream to R2)
    contents = await image.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image too large.")

    # Build key and upload
    bucket = os.getenv("R2_BUCKET")
    if not bucket:
        raise HTTPException(status_code=500, detail="R2_BUCKET not configured on server.")

    # Use owner id and a uuid filename for uniqueness
    ext = ""
    if image.filename and "." in image.filename:
        ext = "." + image.filename.rsplit(".", 1)[1]
    key = f"dogs/{current_user.id}/{uuid4().hex}{ext}"

    try:
        client = get_r2_client()
        # upload_fileobj expects a file-like object; use BytesIO
        from io import BytesIO
        fileobj = BytesIO(contents)

        # Set ContentType so the object serves with correct MIME type
        extra_args = {"ContentType": image.content_type}
        # R2 does not use ACLs like S3; ensure your bucket policy allows public read if you want public access
        client.upload_fileobj(fileobj, bucket, key, ExtraArgs=extra_args)

        public_url = build_r2_public_url(key)

        # If an id was passed, try to attach to the dog
        updated_dog_id = None
        if id:
            try:
                dog_uuid = uuid.UUID(id)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid dog id format.")
            dog = db.query(models.Dog).filter(
                models.Dog.id == dog_uuid,
                models.Dog.owner_id == current_user.id,
            ).first()
            if not dog:
                raise HTTPException(status_code=404, detail="Dog not found.")
            # Save URL to dog record (and optionally into form_data)
            dog.image_url = public_url
            # also add to form_data for convenience (non-destructive)
            try:
                if dog.form_data is None:
                    dog.form_data = {}
                dog.form_data["image_url"] = public_url
            except Exception:
                # if form_data isn't JSON-serializable for some reason, ignore
                pass
            db.commit()
            db.refresh(dog)
            updated_dog_id = str(dog.id)

        return {"success": True, "url": public_url, "dog_id": updated_dog_id}
    except (BotoCoreError, ClientError) as be:
        # S3 / R2 upload error
        print("R2 upload error:", be)
        raise HTTPException(status_code=500, detail="Failed to upload image to storage.")
    except Exception as e:
        print("upload_dog_image error:", e)
        raise HTTPException(status_code=500, detail="Image upload failed.")

