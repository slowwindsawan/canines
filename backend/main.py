from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from app.auth_config import SECRET_KEY, ALGORITHM
from routes import auth, formbuilder, dogs
from app import models
import uvicorn
from app.dependecies import get_current_user
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.include_router(auth.router)
app.include_router(formbuilder.router)
app.include_router(dogs.router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],  # Allow Authorization, Content-Type, etc.
)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@app.post("/me")
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "name":current_user.name,
        "subscription_status": current_user.subscription_status,
        "subscription_tier": current_user.subscription_tier,
        "subscription_current_period_end": current_user.subscription_current_period_end,
        "dogs": current_user.dogs
    }

if __name__ == "__main__":
    print("Starting the FastAPI server....")
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
