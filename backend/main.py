from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.auth_config import SECRET_KEY, ALGORITHM
from routes import auth
from app import models
import uvicorn
from sqlalchemy.orm import Session
from app.dependecies import get_current_user

app = FastAPI()
app.include_router(auth.router)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@app.get("/me")
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }

if __name__ == "__main__":
    print("Starting the FastAPI server....")
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
