from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import SessionLocal
from app import models, schemas
from app.auth import verify_password, get_password_hash, create_access_token, validate_password_strength

router = APIRouter(prefix="/auth", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        return {
            "success": False,
            "message": "Email already registered"
        }

    try:
        validate_password_strength(user.password)
    except ValueError as e:
        return {
            "success": False,
            "message": "Something went wrong!"
        }

    try:
        hashed_pw = get_password_hash(user.password)
        new_user = models.User(
            username=user.email,
            email=user.email,
            hashed_password=hashed_pw,
            name=user.name
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        print(e)
        return {
            "success": False,
            "message": f"Unexpected error"
        }

    return {
        "success": True,
        "message": "Signup successful",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email
        }
    }

@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

