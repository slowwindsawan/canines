from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from app.auth_config import SECRET_KEY, ALGORITHM
from routes import auth, formbuilder, dogs, submissions, admin, articles, chat, payments
from app import models
import uvicorn
from app.dependecies import get_current_user
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.config import SessionLocal

app = FastAPI()
app.include_router(auth.router)
app.include_router(formbuilder.router)
app.include_router(dogs.router)
app.include_router(submissions.router)
app.include_router(admin.router)
app.include_router(articles.router)
app.include_router(chat.router)
app.include_router(payments.router)
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],  # Allow Authorization, Content-Type, etc.
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/me")
def read_users_me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # ✅ fetch admin tip from settings table
    admin_tip = db.query(models.AdminSettings).first()
    tip_value = admin_tip.tip if admin_tip else None
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "name":current_user.name,
        "subscription_status": current_user.subscription_status,
        "subscription_tier": current_user.subscription_tier,
        "subscription_current_period_end": current_user.subscription_current_period_end,
        "dogs": current_user.dogs,
        "tips": tip_value
    }

if __name__ == "__main__":
    print("Starting the FastAPI server....")
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
