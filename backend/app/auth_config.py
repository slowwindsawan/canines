import os
from datetime import timedelta

SECRET_KEY = os.getenv("asfdasdf-sadf-asdfsdafasdf-adsf-sfadsfadfs", "supersecret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7
