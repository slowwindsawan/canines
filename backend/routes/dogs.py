from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import SessionLocal
from sqlalchemy import func
from app import models, schemas
from app.dependecies import get_current_user  # assuming you have JWT auth
from sqlalchemy.exc import IntegrityError
import uuid
from typing import Any, Dict

router = APIRouter(prefix="/dogs", tags=["dogs"])

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/create-dog")
def create_dog(
    dog: schemas.DogCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # --- normalize/validate name ---
        if not dog.name or not dog.name.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dog name is required.")
        name_clean = dog.name.strip()

        # --- check uniqueness for this owner (case-insensitive) ---
        existing = (
            db.query(models.Dog)
            .filter(
                models.Dog.owner_id == current_user.id,
                func.lower(models.Dog.name) == name_clean.lower(),
            )
            .first()
        )
        if existing:
            # Conflict: same owner already has a dog with this name
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A dog with this name already exists for this account. Choose a different name.",
            )

        # --- normalize/merge form_data ---
        form_data: Dict[str, Any] = dog.form_data.copy() if dog.form_data else {}

        # prefer explicit weight_kg, otherwise check form_data keys
        weight_kg = dog.weight_kg if dog.weight_kg is not None else (
            form_data.get("weight_kg") or form_data.get("weight") or None
        )
        if weight_kg is not None:
            form_data["weight_kg"] = weight_kg

        # behavior/notes
        if dog.notes:
            form_data["behaviorNotes"] = dog.notes
        else:
            form_data.setdefault("behaviorNotes", form_data.get("behaviorNotes", ""))

        # copy a few commonly expected fields into form_data if present
        if getattr(dog, "age", None) is not None:
            form_data.setdefault("age", getattr(dog, "age"))
        if getattr(dog, "stoolType", None) is not None:
            form_data.setdefault("stoolType", getattr(dog, "stoolType"))
        if getattr(dog, "symptoms", None) is not None:
            form_data.setdefault("symptoms", getattr(dog, "symptoms"))

        # Keep top-level columns for fast queries, and persist the rest into form_data JSON
        new_dog = models.Dog(
            owner_id=current_user.id,
            name=name_clean,
            breed=dog.breed,
            sex=dog.sex,
            date_of_birth=dog.date_of_birth,
            weight_kg=weight_kg,
            notes=dog.notes if dog.notes else form_data.get("behaviorNotes", ""),
            form_data=form_data,
        )

        db.add(new_dog)
        db.commit()
        db.refresh(new_dog)

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
            },
        }

    except IntegrityError as ie:
        # DB-level integrity problem — rollback and return server error
        db.rollback()
        print("create_dog IntegrityError:", ie)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database integrity error creating dog.")
    except HTTPException:
        # re-raise HTTPExceptions (e.g., conflict or bad request)
        raise
    except Exception as e:
        db.rollback()
        print("create_dog unexpected error:", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error creating dog.")

@router.post("/get-dogs")
def get_dogs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
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
            ]
        }
    except Exception as e:
        print(e)
        return {
            "success": False,
            "message": "Error fetching dogs"
        }

# --- Get a single dog by ID ---
@router.post("/get/{dog_id}")
def get_dog_by_id(
    dog_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print("?>>>>>>>>>>>>>>>>>>>>>",dog_id)
    dog = db.query(models.Dog).filter(models.Dog.id == uuid.UUID(dog_id), models.Dog.owner_id == current_user.id).first()
    if not dog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dog not found")
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
            "form_data": dog.form_data
        }
    }

# --- Update a dog by ID ---
@router.put("/update/{dog_id}")
def update_dog_by_id(
    dog_id: str,
    dog_update: schemas.DogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    dog = db.query(models.Dog).filter(models.Dog.id == uuid.UUID(dog_id), models.Dog.owner_id == current_user.id).first()
    if not dog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dog not found")

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
        db.commit()
        db.refresh(dog)
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
                "form_data": dog.form_data
            }
        }
    except IntegrityError as ie:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database integrity error updating dog")
    except Exception as e:
        db.rollback()
        print("update_dog_by_id error:", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error updating dog")

# --- Delete a dog by ID ---
@router.delete("/delete/{dog_id}")
def delete_dog_by_id(
    dog_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    dog = db.query(models.Dog).filter(models.Dog.id == dog_id, models.Dog.owner_id == current_user.id).first()
    if not dog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dog not found")
    try:
        db.delete(dog)
        db.commit()
        return {"success": True, "message": "Dog deleted successfully"}
    except Exception as e:
        db.rollback()
        print("delete_dog_by_id error:", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error deleting dog")
    