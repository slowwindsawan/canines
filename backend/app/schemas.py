from pydantic import BaseModel, Field
from typing import Any, Dict, Optional, List
from uuid import UUID
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: UUID
    username: str
    email: str
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class OnboardingFormPayload(BaseModel):
    json_data: Any  # Can be dict or list

class OnboardingFormResponse(BaseModel):
    success: bool
    form: Any  # Will return dict or list

    class Config:
        orm_mode = True

class DogCreate(BaseModel):
    name: str
    breed: Optional[str] = None
    age: Optional[str] = None
    sex: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None
    form_data: Optional[dict] = None
    overview: Optional[dict] = None
    protocol: Optional[dict] = None
    admin: Optional[bool] = False
    status: Optional[str] = "in_review"  # default status
    progress: Optional[dict]

class DogUpdate(BaseModel):
    name: Optional[str] = None
    breed: Optional[str] = None
    sex: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None
    form_data: Optional[Dict[str, Any]] = None
    overview: Optional[Dict[str, Any]] = None
    protocol: Optional[Dict[str, Any]] = None
    admin: Optional[bool] = None
    status: Optional[str] = None
    progress: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True

class Dog(BaseModel):
    id: UUID
    name: str
    breed: Optional[str]
    sex: Optional[str]
    weight_kg: Optional[float]
    form_data: Optional[dict]
    overview: Optional[dict]
    protocol: Optional[dict]
    status: Optional[str]

    class Config:
        orm_mode = True

class SubmissionOut(BaseModel):
    id: str
    user_id: str
    dog_id: str
    behaviour_note: str | None
    status: str
    symptoms: dict | None
    priority: str | None
    confidence: int | None
    diagnosis: dict | None
    created_at: str
    updated_at: str

    # Related info
    username: str | None
    name: str | None
    email: str | None
    dog: dict | None

    class Config:
        orm_mode = True

    @classmethod
    def from_orm_with_relations(cls, obj):
        return cls(
            id=str(obj.id),
            user_id=str(obj.user_id),
            dog_id=str(obj.dog_id),
            behaviour_note=obj.behaviour_note,
            status=obj.status,
            symptoms=obj.symptoms,
            confidence=obj.confidence,
            diagnosis=obj.diagnosis,
            priority=obj.priority,
            # Convert datetime to ISO string
            created_at=obj.created_at.isoformat() if obj.created_at else None,
            updated_at=obj.updated_at.isoformat() if obj.updated_at else None,
            username=obj.user.username if obj.user else None,
            name=obj.user.name if obj.user else None,
            email=obj.user.email if obj.user else None,
            dog={
                "id": str(obj.dog.id),
                "name": obj.dog.name,
                "breed": obj.dog.breed,
                "sex": obj.dog.sex,
                "weight_kg": obj.dog.weight_kg,
                "form_data": obj.dog.form_data,
                "overview": obj.dog.overview,
                "protocol": obj.dog.protocol,
                "status": obj.dog.status,
                "progress": obj.dog.progress
            } if obj.dog else None
        )
    
# -------- AdminSettings --------
class AdminSettingsBase(BaseModel):
    brand_settings: Optional[dict] = None
    preferences: Optional[dict] = None
    activities: Optional[dict] = None

class AdminSettingsCreate(AdminSettingsBase):
    admin_id: UUID

class AdminSettingsUpdate(AdminSettingsBase):
    pass

class AdminSettingsOut(AdminSettingsBase):
    id: UUID
    admin_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# -------- Articles --------
class ArticleBase(BaseModel):
    slug: str
    title: str
    content: str
    summary: Optional[str] = None
    cover_image: Optional[str] = None
    tags: Optional[List[str]] = None

class ArticleCreate(ArticleBase):
    author_id: Optional[UUID] = None

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    cover_image: Optional[str] = None
    tags: Optional[List[str]] = None

class ArticleOut(ArticleBase):
    id: UUID
    author_id: Optional[UUID]
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# -------- Users --------
class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


class UserProfileOut(BaseModel):
    id: UUID
    username: str
    name: str
    email: str
    created_at: datetime
    subscription_tier: str
    subscription_status: str
    subscription_current_period_end: Optional[datetime]
    is_on_trial: bool

    class Config:
        orm_mode = True
