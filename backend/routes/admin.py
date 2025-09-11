# app/routers/admin.py  (update)
from fastapi import APIRouter, Depends, HTTPException, Query, Form, File, UploadFile, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime, date, time
from sqlalchemy import or_, func, desc
from app import models
from app.schemas import *
from app.config import SessionLocal
from app.dependecies import get_current_user
from pydantic import BaseModel, constr
import re, os, boto3
from botocore.exceptions import BotoCoreError, ClientError
from botocore.client import Config
from io import BytesIO
from dotenv import load_dotenv

# Load .env from parent directory
load_dotenv()

router = APIRouter(prefix="/admin", tags=["Admin"])
# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------- Articles CRUD ----------
@router.post("/articles", response_model=ArticleOut)
def create_article(payload: ArticleCreate, db: Session = Depends(get_db)):
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
        settings.brand_settings.update(payload["brand_settings"])
    if "preferences" in payload:
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
    Update the admin 'tip' text. Requires an authenticated user (current_admin).
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
    current_user: "models.User" = Depends(get_current_user),
):
    """
    Save theme settings as styles.css in R2 and optionally save a logo image.
    Accepts application/json OR multipart/form-data (with optional file field 'logo').
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
        put_resp = client.put_object(Bucket=bucket, Key=css_key, Body=css_content, ContentType="text/css")
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
