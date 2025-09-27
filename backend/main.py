# main.py
import asyncio
from datetime import datetime
import os

from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy.orm import Session
import stripe
from datetime import datetime, timezone

from app.auth_config import SECRET_KEY, ALGORITHM
from routes import auth, formbuilder, dogs, submissions, admin, articles, chat, payments
from app import models
from app.consultaion import get_calendly_booking_message
from app.dependecies import get_current_user
from app.config import SessionLocal
from ai.openai_client import daily_tip
from dotenv import load_dotenv

# Load .env from parent directory
load_dotenv()

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
    allow_origins=["*"],  # your frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_subscription_end_by_email(email: str):
    customers = stripe.Customer.list(email=email).data
    if not customers:
        return None
    customer = customers[0]

    # Get active subscriptions
    subs = stripe.Subscription.list(customer=customer.id, status="active").data
    if not subs:
        return None

    subscription = subs[0]

    # Now read the period end from subscription items
    # items.data is a list of subscription items; often just one
    if not subscription.get("items") or not subscription["items"].data:
        return None

    # If there are multiple items, pick logic you need (e.g. earliest expiration)
    first_item = subscription["items"].data[0]

    # This is now the correct field
    period_end_ts = first_item.current_period_end
    if period_end_ts is None:
        return None

    end_dt = datetime.fromtimestamp(period_end_ts, tz=timezone.utc)
    return end_dt

@app.post("/me")
def read_users_me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # ✅ fetch admin tip from settings table
    admin_tip = db.query(models.AdminSettings).first()
    tip_value = admin_tip.tip if admin_tip else None
    calendly_status = None
    msg = None
    email = current_user.email
    try:
        calendly_status, msg = get_calendly_booking_message(email=email)
    except Exception as e:
        print("Error fetching Calendly booking message:", e)
    try:
        if not current_user.subscription_current_period_end and current_user.subscription_status == "active":
            pe=get_subscription_end_by_email(current_user.email)
            if pe:
                current_user.subscription_current_period_end = pe
                db.add(current_user)
                db.commit()
    except Exception as e:
        print("Error fetching subscription end:", e)
        pe=None
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "name": current_user.name,
        "subscription_status": current_user.subscription_status,
        "subscription_tier": current_user.subscription_tier,
        "subscription_current_period_end": current_user.subscription_current_period_end,
        "dogs": current_user.dogs,
        "tips": tip_value,
        "user_type": current_user.role,
        "plans":[{"foundation":os.getenv("STRIPE_PLAN_AMOUNT_FOUNDATION"),"therapeutic":os.getenv("STRIPE_PLAN_AMOUNT_THERAPEUTIC"),"comprehensive":os.getenv("STRIPE_PLAN_AMOUNT_COMPREHENSIVE")}],
        "calendly_status": calendly_status,
        "calendly_message": msg
    }

# -------------------------------
# Background loop (run every 2 minutes)
# -------------------------------
last_run = None            # holds datetime.isoformat() of last run
_task: asyncio.Task | None = None
_shutdown_flag = False

async def periodic_job_logic(db: Session):
    """
    Updates the AdminSettings.tip field to "my new tip".
    This function gets its own SQLAlchemy Session (db) from loop_worker.
    """
    NEW_TIP = ""

    try:
        # Try to fetch the singleton admin settings row
        admin_settings = db.query(models.AdminSettings).filter(models.AdminSettings.singleton_key == 1).first()

        if admin_settings:
            # Update existing row
            try:
                # Generate a new tip using the daily_tip function
                NEW_TIP = daily_tip()
                print("[cron] generated new tip:", NEW_TIP)
                admin_settings.tip = NEW_TIP
                db.add(admin_settings)
                db.commit()
            except Exception as e:
                print("[cron] exception generating new tip:", e)
            
            print(f"[cron] updated AdminSettings.tip -> {NEW_TIP}")
        else:
            # If it doesn't exist (shouldn't normally happen due to constraint),
            # create the singleton row with singleton_key=1.
            new_row = models.AdminSettings(singleton_key=1, tip=NEW_TIP)
            db.add(new_row)
            db.commit()
            print("[cron] created AdminSettings row with tip ->", NEW_TIP)
    except Exception as e:
        # Rollback on error so session stays usable next run
        try:
            db.rollback()
        except Exception:
            pass
        print("[cron] exception updating tip:", e)

async def loop_worker():
    """Main loop which runs periodic_job_logic every INTERVAL_SECONDS (measured from start)."""
    global last_run, _shutdown_flag

    INTERVAL_SECONDS = int(os.getenv("CRON_INTERVAL_SECONDS", 24 * 60 * 60))  # default 24 hours
    print(f"[cron] interval set to {INTERVAL_SECONDS} seconds")

    while not _shutdown_flag:
        start_time = datetime.utcnow()
        print(f"[cron] starting run at {start_time.isoformat()}")

        db = SessionLocal()
        try:
            # run the job (periodic_job_logic uses this db)
            await periodic_job_logic(db)
            last_run = datetime.utcnow().isoformat()
            print(f"[cron] finished run at {last_run}")
        except Exception as e:
            # ensure exceptions don't kill the loop
            print("[cron] uncaught exception in loop_worker:", e)
        finally:
            try:
                db.close()
            except Exception:
                pass

        # compute elapsed and sleep the remainder so start-to-start ~= INTERVAL_SECONDS
        elapsed = (datetime.utcnow() - start_time).total_seconds()
        sleep_time = max(0, INTERVAL_SECONDS - elapsed)
        print(f"[cron] sleeping for {sleep_time} seconds (elapsed {elapsed:.2f}s)")
        await asyncio.sleep(sleep_time)

@app.on_event("startup")
async def startup_event():
    """
    Starts background task on app startup.
    WARNING: If you run uvicorn with multiple workers or certain reload setups,
    this may start multiple tasks (one per process). For single-run scheduling across
    processes, run the scheduler in a separate service/process or use an external scheduler.
    """
    global _task
    # Optional: avoid starting the task in the autoreload watcher process
    # (uvicorn's reload spawns a watcher process) — you may need to adjust this depending on env.
    # For simplicity we start the background task unconditionally here.
    _task = asyncio.create_task(loop_worker())
    print("[startup] background cron loop started")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Clean shutdown of background task.
    """
    global _shutdown_flag, _task
    print("[shutdown] stopping background cron loop...")
    _shutdown_flag = True
    if _task:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
    print("[shutdown] background cron loop stopped")

@app.get("/cron/status")
async def cron_status():
    return {"last_run": last_run}

# -------------------------------
# Run with uvicorn
# -------------------------------
# if __name__ == "__main__":
#     print("Starting the FastAPI server....")
#     # For development:
#     # uvicorn main:app --reload
#     # For production ensure single worker if you want only one in-process scheduler:
#     # uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
#     uvicorn.run("main:app", host="localhost", port=8000, reload=True)
