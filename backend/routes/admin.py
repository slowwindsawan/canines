# app/routers/admin.py  (update)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, time
from sqlalchemy import or_, func, desc
from app import models
from app.schemas import *
from app.config import SessionLocal
from app.dependecies import get_current_user

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