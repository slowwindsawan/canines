from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app import models, schemas
from app.config import SessionLocal
from app.dependecies import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/articles", tags=["articles"])

# ----------------- Dependency -----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ----------------- Pydantic Schemas -----------------
class ArticleCreate(BaseModel):
    slug: str
    title: str
    content: str
    summary: Optional[str] = None
    cover_image: Optional[str] = None
    tags: Optional[List[str]] = None
    published_at: Optional[datetime] = None

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    cover_image: Optional[str] = None
    tags: Optional[List[str]] = None
    published_at: Optional[datetime] = None

class ArticleOut(BaseModel):
    id: UUID
    slug: str
    title: str
    content: str
    summary: Optional[str]
    cover_image: Optional[str]
    author_id: Optional[UUID]
    tags: Optional[List[str]]
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# ----------------- Create Article -----------------
@router.post("/create", response_model=ArticleOut)
def create_article(
    article_in: ArticleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    article = models.Article(
        slug=article_in.slug,
        title=article_in.title,
        content=article_in.content,
        summary=article_in.summary,
        cover_image=article_in.cover_image,
        tags=article_in.tags,
        published_at=article_in.published_at,
        author_id=current_user.id,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article

# ----------------- Query Articles -----------------
@router.post("/")
def query_articles(
    article_id: Optional[UUID] = None,
    author_id: Optional[UUID] = None,
    slug: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Article)
    if article_id:
        article = query.filter(models.Article.id == article_id).first()
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        return [article]
    if author_id:
        query = query.filter(models.Article.author_id == author_id)
    if slug:
        query = query.filter(models.Article.slug == slug)

    articles = query.all()
    return articles

# ----------------- Update Article -----------------
@router.post("/update/{article_id}", response_model=ArticleOut)
def update_article(
    article_id: UUID,
    article_in: ArticleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to update this article")

    for field, value in article_in.dict(exclude_unset=True).items():
        setattr(article, field, value)

    db.commit()
    db.refresh(article)
    return article

# ----------------- Delete Article -----------------
@router.post("/delete/{article_id}", response_model=dict)
def delete_article(
    article_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this article")

    db.delete(article)
    db.commit()
    return {"detail": "Article deleted successfully"}
