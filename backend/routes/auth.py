# app/api/auth.py
from datetime import datetime, timedelta, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.dependecies import get_current_user
from app.config import SessionLocal
from app import models, schemas
from app.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    validate_password_strength,
)
from app.mail import send_email

router = APIRouter(prefix="/auth", tags=["auth"])

OTP_TTL_MINUTES = 10


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_otp(length: int = 6) -> str:
    """
    Generate a numeric OTP. Enforce exactly 6 digits.
    """
    if length != 6:
        raise ValueError("OTP length must be exactly 6 digits")
    return "".join(secrets.choice("0123456789") for _ in range(length))


class VerifyRequest(BaseModel):
    email: EmailStr
    otp: str


def _ensure_aware_utc(dt: datetime) -> datetime:
    """
    Ensure a datetime is timezone-aware in UTC.
    If dt is naive, attach UTC tzinfo. If aware, convert to UTC.
    """
    if dt is None:
        return dt
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@router.post("/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Create a PendingUser and send OTP. Do NOT create a real User until OTP verified.
    """
    # 1) ensure email not already registered in users
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        return {"success": False, "message": "Email already registered"}

    # 2) validate password strength
    try:
        validate_password_strength(user.password)
    except ValueError:
        return {"success": False, "message": "Weak password"}

    # 3) prepare data
    hashed_pw = get_password_hash(user.password)
    otp = generate_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)

    # 4) upsert into pending_users
    pending = db.query(models.PendingUser).filter(models.PendingUser.email == user.email).first()
    try:
        if pending:
            # update existing pending record (refresh OTP & expiry, update password if provided)
            pending.hashed_password = hashed_pw
            pending.otp = otp
            pending.otp_expiry = expiry
            pending.username = user.email
            pending.name = user.name or pending.name or ""
            pending.updated_at = datetime.now(timezone.utc)
            db.add(pending)
            db.commit()
            db.refresh(pending)
        else:
            pending = models.PendingUser(
                username=user.email,
                email=user.email,
                name=user.name or "",
                hashed_password=hashed_pw,
                otp=otp,
                otp_expiry=expiry,
            )
            db.add(pending)
            db.commit()
            db.refresh(pending)
    except Exception as e:
        # don't leak internal error to client
        print("signup error:", e)
        db.rollback()
        return {"success": False, "message": "Unexpected error"}

    # 5) send OTP email
    subject = "Your verification code"
    body = (
        f"Hello {user.name},\n\nYour 'Thecaninenutritionist' verification code is: {otp}\n\n"
        f"This code will expire in {OTP_TTL_MINUTES} minutes.\n\n"
        "If you did not request this, please ignore this email."
    )
    try:
        send_email(pending.email, subject, body, "plain")
    except Exception as e:
        print("failed to send email:", e)
        # still keep pending user, but inform client
        return {"success": False, "message": "Failed to send OTP email. Try again later."}

    return {"success": True, "message": "OTP sent to email"}


@router.post("/verify-otp")
def verify_otp(req: VerifyRequest, db: Session = Depends(get_db)):
    """
    Verify OTP for a pending user. On success:
      - create a real User row,
      - delete the PendingUser row,
      - return access token (optional).
    """
    # Basic OTP format validation: must be exactly 6 digits
    if not (req.otp.isdigit() and len(req.otp) == 6):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP must be exactly 6 digits")

    pending = db.query(models.PendingUser).filter(models.PendingUser.email == req.email).first()
    if not pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No pending signup for this email")

    # normalize pending.otp_expiry to aware UTC before comparing
    try:
        pending_expiry = _ensure_aware_utc(pending.otp_expiry)
    except Exception:
        # If for some reason expiry is invalid, remove pending and ask to signup again
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid pending OTP expiry. Please signup again.")

    if pending_expiry < datetime.now(timezone.utc):
        # remove expired pending
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired. Please signup again.")

    if pending.otp != req.otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

    # double-check user does not already exist (race)
    existing_user = db.query(models.User).filter(models.User.email == pending.email).first()
    if existing_user:
        # cleanup pending and inform
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # create real user
    try:
        username = pending.username or pending.email.split("@")[0]
        new_user = models.User(
            username=username,
            name=pending.name or "",
            email=pending.email,
            hashed_password=pending.hashed_password,
        )
        db.add(new_user)
        # delete pending
        db.delete(pending)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        print("verify_otp error:", e)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create user")

    # issue access token (optional)
    token = create_access_token(data={"sub": new_user.email})
    return {"success": True, "message": "Verified. User created.", "access_token": token, "token_type": "bearer", "user_id": str(new_user.id)}


@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Login only allowed for fully created users (not pending).
    """
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Authenticated user changes password by providing current password + new password.
    No OTP required.
    """
    # verify old password
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # validate new password strength
    try:
        validate_password_strength(payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e) or "Weak password")

    try:
        current_user.hashed_password = get_password_hash(payload.new_password)
        db.add(current_user)
        db.commit()
        return {"success": True, "message": "Password changed successfully"}
    except Exception as e:
        print("change_password error:", e)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to change password")


@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiate password reset: generate OTP and send email.
    Response is generic (do not reveal whether email exists).
    """
    # Always respond success (avoid account enumeration), but only create OTP if user exists.
    otp = generate_otp()  # this enforces length==6 by your generate_otp implementation
    expiry = datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user:
        try:
            # upsert into password_resets
            pr = db.query(models.PasswordReset).filter(models.PasswordReset.email == payload.email).first()
            if pr:
                pr.otp = otp
                pr.otp_expiry = expiry
                pr.created_at = datetime.now(timezone.utc)
                db.add(pr)
            else:
                pr = models.PasswordReset(email=payload.email, otp=otp, otp_expiry=expiry)
                db.add(pr)
            db.commit()
            db.refresh(pr)

            # send email with OTP
            subject = "Your password reset code"
            body = (
                f"Hello,\n\nYour password reset code is: {otp}\n\n"
                f"This code will expire in {OTP_TTL_MINUTES} minutes.\n\n"
                "If you did not request this, please ignore this email."
            )
            try:
                send_email(payload.email, subject, body, "plain")
            except Exception as e:
                print("forgot_password send_email failed:", e)
                # swallow — we still return generic success
        except Exception as e:
            print("forgot_password db error:", e)
            db.rollback()
            # don't reveal — fall through to generic success

    # generic response
    return {"success": True, "message": "If an account with that email exists, an OTP was sent."}


@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Verify OTP and set a new password for the given email.
    """
    # basic OTP format check
    if not (payload.otp.isdigit() and len(payload.otp) == 6):
        raise HTTPException(status_code=400, detail="OTP must be exactly 6 digits")

    # find the reset record
    pr = db.query(models.PasswordReset).filter(models.PasswordReset.email == payload.email).first()
    if not pr:
        raise HTTPException(status_code=400, detail="Invalid OTP or no reset requested")

    # normalize expiry
    try:
        pr_expiry = _ensure_aware_utc(pr.otp_expiry)
    except Exception:
        db.delete(pr)
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid reset record. Please request a new OTP.")

    if pr_expiry < datetime.now(timezone.utc):
        # expired -> delete and ask to request again
        db.delete(pr)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new password reset.")

    if pr.otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # validate new password strength
    try:
        validate_password_strength(payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e) or "Weak password")

    # find user and update password
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        # Cleanup the reset record to avoid reuse
        db.delete(pr)
        db.commit()
        # For security, don't reveal too many details
        raise HTTPException(status_code=400, detail="Invalid request")

    try:
        user.hashed_password = get_password_hash(payload.new_password)
        db.add(user)
        # delete the reset record
        db.delete(pr)
        db.commit()
        return {"success": True, "message": "Password reset successful"}
    except Exception as e:
        print("reset_password error:", e)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to reset password")

