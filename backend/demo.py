# reset_stripe_ids.py
import sys
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ✅ Import your User model & Base
from app import models
from db.database import Base  # adjust to where your Base is defined
import os
from dotenv import load_dotenv

# Load .env from parent directory
load_dotenv()

# ---------- CONFIG ----------
DATABASE_URL = os.getenv("DATABASE_URL")
# ----------------------------

def reset_stripe_ids(email: str):
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db: Session = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print(f"❌ No user found with email {email}")
            return

        print(f"✅ Found user {user.id} ({user.email}), resetting Stripe fields...")

        user.stripe_customer_id = None
        user.stripe_subscription_id = None
        db.add(user)
        db.commit()

        print("✔️ Stripe IDs reset successfully.")
    except Exception as e:
        print("❌ Error:", str(e))
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python reset_stripe_ids.py user@example.com")
    else:
        reset_stripe_ids(sys.argv[1])
