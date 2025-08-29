from pydantic import BaseModel
from typing import Any
from uuid import UUID
from typing import Optional
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
    sex: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None
    form_data: Optional[dict] = None
