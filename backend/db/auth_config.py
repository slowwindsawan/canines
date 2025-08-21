import os
from datetime import timedelta

SECRET_KEY = os.getenv("haskfd-asdf-adsfasdf-sfhs9sf-sfkj", "supersecret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
