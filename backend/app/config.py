import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./db/app.db")

# For SQLite we need check_same_thread=False
# engine = create_engine(
#     DATABASE_URL, connect_args={"check_same_thread": False}
# )

engine = create_engine(DATABASE_URL, pool_pre_ping=True)  # ✅ no connect_args

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
