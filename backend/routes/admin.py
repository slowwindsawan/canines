# app/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException, Query, Form, File, UploadFile, Request, status, Path
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime, date, time
from sqlalchemy import or_, func, desc
from app import models
from app.schemas import *
from app.config import SessionLocal
from app.dependecies import get_current_user, get_db as project_get_db
from pydantic import BaseModel, constr
import re, os, boto3
from botocore.exceptions import BotoCoreError, ClientError
from botocore.client import Config
from io import BytesIO
from dotenv import load_dotenv

from typing import Optional, List, Tuple, Dict
from app.models import User, Dog, SubscriptionTier, SubscriptionStatus
# Load .env from parent directory
load_dotenv()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _is_admin_user(user: models.User) -> bool:
    """
    Robust check whether `user` is admin.
    Handles SQLAlchemy Enum objects, Python Enums, or raw strings.
    """
    if user is None:
        return False
    role = getattr(user, "role", None)
    if role is None:
        # fallback to boolean flags if present
        if getattr(user, "is_admin", False) or getattr(user, "is_superuser", False):
            return True
        return False

    # If role is a Python Enum (with .value), try to get .value
    try:
        val = getattr(role, "value", role)
    except Exception:
        val = role

    # finally compare as lowercase string
    try:
        return str(val).lower() == "admin"
    except Exception:
        return False

def require_admin(current_user: models.User = Depends(get_current_user)):
    """
    Dependency that raises 403 unless the current_user is admin.
    Use this in router-level dependencies so all endpoints require admin.
    """
    if not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

# --------------------- Router (admin-only) ---------------------
# The require_admin dependency ensures all routes below require admin.
router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_admin)])

# ---------- Articles CRUD ----------
@router.post("/articles", response_model=ArticleOut)
def create_article(payload: ArticleCreate, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_user)):
    article = models.Article(**payload.dict())
    db.add(article)
    db.commit()
    db.refresh(article)
    return article

# --- Updated list_articles with pagination & filtering ---
@router.get("/articles", response_model=List[ArticleOut])
def list_articles(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(3, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    author_id: Optional[UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    """
    List articles with server-side pagination and basic filters.
    Query params:
      - page (int) default 1
      - page_size (int) default 3
      - search (str) searches title/summary/content (ILIKE)
      - category (str)
      - author_id (UUID)
      - date_from (YYYY-MM-DD)
      - date_to (YYYY-MM-DD)
    """
    q = db.query(models.Article)

    # filters
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                models.Article.title.ilike(like),
                models.Article.summary.ilike(like),
                models.Article.content.ilike(like),
            )
        )

    if category:
        q = q.filter(models.Article.category == category)

    if author_id:
        q = q.filter(models.Article.author_id == author_id)

    if date_from:
        # include entire day -> from 00:00:00
        start_dt = datetime.combine(date_from, time.min)
        q = q.filter(models.Article.published_at >= start_dt)

    if date_to:
        # include entire day -> until 23:59:59
        end_dt = datetime.combine(date_to, time.max)
        q = q.filter(models.Article.published_at <= end_dt)

    # ordering: published_at desc (nulls last), fallback to created_at desc
    q = q.order_by(
        desc(models.Article.published_at),
        desc(models.Article.created_at)
    )

    offset = (page - 1) * page_size
    results = q.offset(offset).limit(page_size).all()
    return results


@router.get("/articles/{article_id}", response_model=ArticleOut)
def get_article(article_id: UUID, db: Session = Depends(get_db)):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@router.put("/articles/{article_id}", response_model=ArticleOut)
def update_article(article_id: UUID, payload: ArticleUpdate, db: Session = Depends(get_db)):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(article, field, value)
    db.commit()
    db.refresh(article)
    return article

@router.delete("/articles/{article_id}")
def delete_article(article_id: UUID, db: Session = Depends(get_db)):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
    return {"detail": "Article deleted successfully"}

#---------------- Settings ------------
@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(models.AdminSettings).first()
    if not settings:
        # Auto-create with defaults if not exists
        settings = models.AdminSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/settings")
def update_settings(payload: dict, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_user)):
    settings = db.query(models.AdminSettings).first()
    if not settings:
        settings = models.AdminSettings(admin_id=current_admin.id)
        db.add(settings)

    # Update only provided fields
    if "brand_settings" in payload:
        # ensure dict exists
        if settings.brand_settings is None:
            settings.brand_settings = {}
        settings.brand_settings.update(payload["brand_settings"])
    if "preferences" in payload:
        if settings.preferences is None:
            settings.preferences = {}
        settings.preferences.update(payload["preferences"])
    if "activities" in payload:
        settings.activities = payload["activities"]

    settings.admin_id = current_admin.id  # last updated by
    db.commit()
    db.refresh(settings)
    return settings

class TipUpdate(BaseModel):
    tip: constr(max_length=2000)

@router.get("/settings/tip")
def get_tip(db: Session = Depends(get_db)):
    """
    Return the admin 'tip' text. Auto-creates AdminSettings if not present.
    """
    settings = db.query(models.AdminSettings).first()
    if not settings:
        settings = models.AdminSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return {"tip": settings.tip}

@router.put("/settings/tip")
def update_tip(
    payload: TipUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_user),
):
    """
    Update the admin 'tip' text. Requires an authenticated admin user (enforced by router-level dependency).
    Sets `admin_id` to the current user to track who updated it.
    """
    settings = db.query(models.AdminSettings).first()
    if not settings:
        settings = models.AdminSettings(admin_id=current_admin.id, tip=payload.tip)
        db.add(settings)
    else:
        # overwrite tip and record who updated it last
        settings.tip = payload.tip
        settings.admin_id = current_admin.id

    db.commit()
    db.refresh(settings)
    return {"success": True, "tip": settings.tip}

# ------------------------> default CSS template (values will be replaced)
CSS_TEMPLATE = """/* Background colors */


.bg-brand-offwhite {{
  background-color: {bg_offwhite} !important;
}}

.bg-brand-charcoal, .from-brand-charcoal, .to-brand-charcol {{
  background-color: {bg_charcoal} !important;
}}

.bg-brand-midgrey, .to-brand-midgrey, .from-brand-midgrey {{
  background-color: {bg_midgrey} !important;
}}

/* Text colors */
.text-brand-offwhite {{
  color: {text_offwhite} !important;
}}

.text-brand-charcoal {{
  color: {text_charcoal} !important;
}}

.text-brand-midgrey {{
  color: {text_midgrey} !important;
}}
"""

HEX_RE = re.compile(r"^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$")

def get_r2_client():
    return boto3.client(
        "s3",
        region_name="auto",  # Dummy region, required
        aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
        endpoint_url=os.getenv("R2_ENDPOINT"),  # https://<account_id>.r2.cloudflarestorage.com
        config=Config(signature_version="s3v4"),  # ✅ Force correct signing
    )

def _normalize_hex(value: Optional[str], default: str) -> str:
    """
    Ensure hex string starts with '#' and is valid 3 or 6 hex digits.
    If invalid or None, return default.
    """
    if not value:
        return default
    v = value.strip()
    if not v:
        return default
    if not v.startswith("#"):
        v = "#" + v
    if HEX_RE.match(v):
        return v
    return default

def _build_public_url_for_key(key: str) -> str:
    """
    Build a public URL for the object key without relying on possibly-broken helpers.
    Priority:
    1) R2_PUBLIC_BASE_URL if set (use it as base)
    2) fallback to https://{bucket}.{account}.r2.cloudflarestorage.com/{key}
    3) final fallback: return key
    """
    base = os.getenv("R2_PUBLIC_BASE_URL")
    if base:
        return f"{base.rstrip('/')}/{key}"
    bucket = os.getenv("R2_BUCKET")
    account = os.getenv("R2_ACCOUNT_ID")
    if bucket and account:
        return f"https://{bucket}.{account}.r2.cloudflarestorage.com/{key}"
    return key

@router.post("/save-settings")
async def save_settings(
    request: Request,
    current_admin: "models.User" = Depends(get_current_user),
):
    """
    Save theme settings as styles.css in R2 and optionally save a logo image.
    Accepts application/json OR multipart/form-data (with optional file field 'logo').
    This endpoint requires admin access (router-level dependency).
    """

    def _get_value(source: Any, *keys):
        for k in keys:
            try:
                if isinstance(source, dict):
                    if k in source and source[k] is not None:
                        return source[k]
                else:
                    # FormData-like object
                    v = source.get(k)
                    if v is not None:
                        return v
            except Exception:
                continue
        return None

    content_type = (request.headers.get("content-type") or "").lower()
    is_json = content_type.startswith("application/json")

    # defaults
    defaults = {
        "bg_offwhite": "#f0f0ec",
        "bg_charcoal": "#373737",
        "bg_midgrey": "#5A5A5A",
        "text_offwhite": "#f0f0ec",
        "text_charcoal": "#373737",
        "text_midgrey": "#5A5A5A",
    }

    form_source = None
    logo_upload = None

    if is_json:
        payload = await request.json()
        form_source = payload
        logo_upload = None
        print("save_settings: received JSON payload")
    else:
        form = await request.form()
        form_source = form
        print("save_settings: received form payload; keys:", list(form.keys()))
        # candidate may be UploadFile or string
        candidate = form.get("logo") or form.get("logoFile") or form.get("file")
        # robust detection: check UploadFile type or fallback on attributes typical of files
        if candidate is not None:
            from fastapi import UploadFile as FastAPIUploadFile
            if isinstance(candidate, FastAPIUploadFile) or (
                hasattr(candidate, "filename") and hasattr(candidate, "content_type")
            ):
                logo_upload = candidate
                print("logo candidate detected:", getattr(candidate, "filename", None))
            else:
                logo_upload = None

    # read color fields (support multiple naming variants)
    bg_offwhite = _get_value(form_source, "bg_offwhite", "bgOffwhite", "brandOffwhite", "brand_offwhite")
    bg_charcoal = _get_value(form_source, "bg_charcoal", "bgCharcoal", "brandCharcoal", "brand_charcoal")
    bg_midgrey = _get_value(form_source, "bg_midgrey", "bgMidgrey", "brandMidgrey", "brand_midgrey", "brandMidGrey")

    text_offwhite = _get_value(form_source, "text_offwhite", "textOffwhite", "textOffWhite", "text_offwhite")
    text_charcoal = _get_value(form_source, "text_charcoal", "textCharcoal", "text_charcoal")
    text_midgrey = _get_value(form_source, "text_midgrey", "textMidgrey", "text_midgrey")

    # fallback + normalize
    bg_offwhite = _normalize_hex(bg_offwhite, defaults["bg_offwhite"])
    bg_charcoal = _normalize_hex(bg_charcoal, defaults["bg_charcoal"])
    bg_midgrey = _normalize_hex(bg_midgrey, defaults["bg_midgrey"])
    text_offwhite = _normalize_hex(text_offwhite, defaults["text_offwhite"])
    text_charcoal = _normalize_hex(text_charcoal, defaults["text_charcoal"])
    text_midgrey = _normalize_hex(text_midgrey, defaults["text_midgrey"])

    # Build CSS bytes
    css_content = CSS_TEMPLATE.format(
        bg_offwhite=bg_offwhite,
        bg_charcoal=bg_charcoal,
        bg_midgrey=bg_midgrey,
        text_offwhite=text_offwhite,
        text_charcoal=text_charcoal,
        text_midgrey=text_midgrey,
    ).encode("utf-8")

    bucket = os.getenv("R2_BUCKET")
    if not bucket:
        raise HTTPException(status_code=500, detail="R2_BUCKET not configured on server.")

    # Upload CSS using put_object (simpler and returns metadata)
    try:
        client = get_r2_client()
        css_key = "styles.css"
        put_resp = client.put_object(Bucket=bucket, Key=css_key, Body=css_content, ContentType="text/css", CacheControl="no-cache, no-store, max-age=0, must-revalidate")
        print("styles.css put_object response:", put_resp)
        css_url = _build_public_url_for_key(css_key)
    except (BotoCoreError, ClientError) as be:
        print("R2 upload error (css):", be)
        raise HTTPException(status_code=500, detail="Failed to upload styles.css to storage.")
    except Exception as e:
        print("save_settings css error:", e)
        raise HTTPException(status_code=500, detail="Failed to save styles.css.")

    logo_url = None
    if logo_upload:
        # If logo_upload is a starlette UploadFile-like object -> read bytes
        try:
            # UploadFile may provide .file or .read()
            if hasattr(logo_upload, "read"):
                contents = await logo_upload.read()
                filename = getattr(logo_upload, "filename", None)
                content_type = getattr(logo_upload, "content_type", None)
            else:
                # fallback: it might be a path or string, reject gracefully
                raise HTTPException(status_code=400, detail="Unable to read uploaded logo file.")
        except Exception as e:
            print("error reading uploaded logo:", e)
            raise HTTPException(status_code=400, detail="Failed to read uploaded logo file.")

        MAX_LOGO_BYTES = 4 * 1024 * 1024
        if len(contents) > MAX_LOGO_BYTES:
            raise HTTPException(status_code=413, detail="Logo file too large (max 4 MB).")

        # derive extension
        ext = None
        if filename and "." in filename:
            ext = filename.rsplit(".", 1)[1].lower()
        else:
            if content_type and "/" in content_type:
                ext = content_type.split("/", 1)[1]
        if not ext:
            ext = "png"

        allowed_exts = {"png", "jpg", "jpeg", "webp", "gif", "svg"}
        if ext not in allowed_exts:
            if ext == "pjpeg":
                ext = "jpg"
            else:
                ext = "png"

        logo_key = f"logo.{ext}"
        try:
            put_resp = client.put_object(Bucket=bucket, Key=logo_key, Body=contents, ContentType=(content_type or f"image/{ext}"))
            print("logo put_object response:", put_resp)
            logo_url = _build_public_url_for_key(logo_key)
        except (BotoCoreError, ClientError) as be:
            print("R2 upload error (logo):", be)
            raise HTTPException(status_code=500, detail="Failed to upload logo to storage.")
        except Exception as e:
            print("save_settings logo error:", e)
            raise HTTPException(status_code=500, detail="Failed to save logo.")

    # Debug print final urls
    print("save_settings returning ", {"css_url": css_url, "logo_url": logo_url})

    return {"success": True, "css_url": css_url, "logo_url": logo_url}


def _serialize_datetime(dt):
    return dt.isoformat() if dt is not None else None

def _serialize_user(u: User, dogs_count: int):
    return {
        "id": str(u.id),
        "username": u.username,
        "name": u.name,
        "email": u.email,
        "role": u.role.value if hasattr(u.role, "value") else u.role,
        "stripe_customer_id": u.stripe_customer_id,
        "stripe_subscription_id": u.stripe_subscription_id,
        "subscription_price_id": u.stripe_price_id,
        "subscription_tier": (u.subscription_tier.value if hasattr(u.subscription_tier, "value") else u.subscription_tier),
        "subscription_status": (u.subscription_status.value if hasattr(u.subscription_status, "value") else u.subscription_status),
        "subscription_current_period_end": _serialize_datetime(u.subscription_current_period_end),
        "is_on_trial": bool(u.is_on_trial),
        "is_active": bool(u.is_active),
        "created_at": _serialize_datetime(u.created_at),
        "updated_at": _serialize_datetime(u.updated_at),
        "dogs_count": int(dogs_count),
    }

def _serialize_dog(d: Dog):
    return {
        "id": str(d.id),
        "name": d.name,
        "image_url": d.image_url,
        "breed": d.breed,
        "sex": d.sex,
        "date_of_birth": _serialize_datetime(d.date_of_birth),
        "weight_kg": float(d.weight_kg) if d.weight_kg is not None else None,
        "notes": d.notes,
        "status": d.status,
        "created_at": _serialize_datetime(d.created_at),
        "updated_at": _serialize_datetime(d.updated_at),
    }

# assume router and get_db already defined in this module
# router = APIRouter(tags=["admin"])
@router.get("/users")
def admin_list_users(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(25, ge=1, le=200, description="Items per page"),
    q: Optional[str] = Query(None, description="Search query for email, name or username (case-insensitive)"),
    status: Optional[str] = Query(None, description="Filter by subscription_status (e.g., active, trialing)"),
    plan: Optional[str] = Query(None, description="Filter by subscription_tier (foundation, therapeutic, comprehensive)"),
    order_by: Optional[str] = Query("created_at", description="Order by field (created_at, name, email)"),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint to fetch users with pagination + totals.

    - `q` searches email, name, username (ilike %q%).
    - `status` filters subscription_status.
    - `plan` filters subscription_tier.
    - Returns: users (list), pagination metadata, totals:
        - total_users: all users in DB
        - filtered_users: number after applying filters
        - active_subscriptions: count of subscription_status == 'active' (overall)
        - by_plan: counts for the three SubscriptionTier values (applies current filters)
        - by_subscription_status: counts grouped by subscription_status (applies current filters)
    """
    # --- build filters (q -> OR across fields; status/plan -> exact matches combined with AND) ---
    filters = []
    if q:
        q_like = f"%{q}%"
        filters.append(or_(
            User.email.ilike(q_like),
            User.name.ilike(q_like),
            User.username.ilike(q_like),
        ))

    if status:
        # Expecting a string like "active", "trialing", etc.
        filters.append(User.subscription_status == status)

    if plan:
        # Expecting a string like "foundation", "therapeutic", "comprehensive"
        filters.append(User.subscription_tier == plan)

    # --- totals (overall and filtered) ---
    total_users = db.query(func.count(User.id)).scalar() or 0
    filtered_users = db.query(func.count(User.id)).filter(*filters).scalar() if filters else total_users

    # overall active subscriptions (not affected by current filters)
    active_subscriptions = db.query(func.count(User.id)).filter(User.subscription_status == SubscriptionStatus.ACTIVE.value).scalar() or 0

    # counts per plan (apply current filters so these reflect the filtered set)
    plan_counts_query = db.query(User.subscription_tier, func.count(User.id))
    if filters:
        plan_counts_query = plan_counts_query.filter(*filters)
    plan_counts_query = plan_counts_query.group_by(User.subscription_tier)
    raw_plan_counts = plan_counts_query.all()  # list of (tier, count)

    # normalize into dict including all known tiers (default 0)
    by_plan = {
        SubscriptionTier.FOUNDATION.value: 0,
        SubscriptionTier.THERAPEUTIC.value: 0,
        SubscriptionTier.COMPREHENSIVE.value: 0,
    }
    for tier, cnt in raw_plan_counts:
        key = tier.value if hasattr(tier, "value") else tier
        if key is None:
            continue
        by_plan[key] = int(cnt)

    # subscription status counts (apply current filters)
    status_counts = {}
    status_q = db.query(User.subscription_status, func.count(User.id)).group_by(User.subscription_status)
    if filters:
        status_q = status_q.filter(*filters)
    for st, cnt in status_q.all():
        k = st.value if hasattr(st, "value") else st
        status_counts[k] = int(cnt)

    # --- user list with dogs_count (single query using outerjoin + group_by) ---
    order_col = User.created_at
    if order_by == "name":
        order_col = User.name
    elif order_by == "email":
        order_col = User.email

    offset = (page - 1) * per_page

    base_query = db.query(User, func.count(Dog.id).label("dogs_count")).outerjoin(Dog, Dog.owner_id == User.id)
    if filters:
        base_query = base_query.filter(*filters)

    users_with_counts: List[Tuple[User, int]] = (
        base_query.group_by(User.id)
          .order_by(desc(order_col))
          .limit(per_page)
          .offset(offset)
          .all()
    )

    def _serialize_datetime(dt):
        return dt.isoformat() if dt is not None else None

    def _serialize_user(u: User, dogs_count: int):
        return {
            "id": str(u.id),
            "username": u.username,
            "name": u.name,
            "email": u.email,
            "role": u.role.value if hasattr(u.role, "value") else u.role,
            "stripe_customer_id": u.stripe_customer_id,
            "stripe_subscription_id": u.stripe_subscription_id,
            "subscription_price_id": u.stripe_price_id,
            "subscription_tier": (u.subscription_tier.value if hasattr(u.subscription_tier, "value") else u.subscription_tier),
            "subscription_status": (u.subscription_status.value if hasattr(u.subscription_status, "value") else u.subscription_status),
            "subscription_current_period_end": _serialize_datetime(u.subscription_current_period_end),
            "is_on_trial": bool(u.is_on_trial),
            "is_active": bool(u.is_active),
            "created_at": _serialize_datetime(u.created_at),
            "updated_at": _serialize_datetime(u.updated_at),
            "dogs_count": int(dogs_count),
        }

    users_serialized = [_serialize_user(u, dogs_count) for u, dogs_count in users_with_counts]

    # --- pagination metadata ---
    total_pages = (int(filtered_users) + per_page - 1) // per_page if per_page else 1

    response = {
        "users": users_serialized,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "filtered_users": int(filtered_users),
            "total_users": int(total_users),
        },
        "totals": {
            "total_users": int(total_users),
            "filtered_users": int(filtered_users),
            "active_subscriptions": int(active_subscriptions),
            "by_plan": by_plan,
            "by_subscription_status": status_counts,
        }
    }

    return response

@router.get("/users/{user_id}/dogs")
def admin_get_user_dogs(
    user_id: UUID = Path(..., description="User UUID"),
    db: Session = Depends(get_db),
):
    """
    Return list of dogs for a user — frontend expects { dogs: [...] }.
    """
    # ensure user exists (clear 404 for nicer UX)
    user_exists = db.query(func.count(User.id)).filter(User.id == user_id).scalar()
    if not user_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    dogs: List[Dog] = db.query(Dog).filter(Dog.owner_id == user_id).order_by(Dog.created_at.desc()).all()
    dogs_serialized = [_serialize_dog(d) for d in dogs]
    return {"dogs": dogs_serialized}
