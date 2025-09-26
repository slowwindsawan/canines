"""
Migration script: migrate_prices.py

Targets: adapt to your project layout (you already have `app.models`, `app.config.SessionLocal`, etc.)
Place this file in your project (outside the main app) and run with the same virtualenv that has stripe & your app dependencies.

IMPORTANT:
 - Run in Stripe TEST MODE first.
 - Back up your DB before running.
 - This script is intended to be a safe, batched migration tool with a dry-run option.

Usage examples:
  STRIPE_API_KEY=sk_test_xxx python migrate_prices.py --mode dry_run
  STRIPE_API_KEY=sk_test_xxx python migrate_prices.py --mode schedule_next_cycle --tier therapeutic

"""

import os
import time
import argparse
import stripe
from datetime import datetime

# Load dotenv if available (optional)
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Project imports (adapt if paths differ)
from app.config import SessionLocal
from app import models

# Configure stripe from environment
stripe.api_key = os.environ.get("STRIPE_API_KEY")
if not stripe.api_key:
    raise RuntimeError("STRIPE_API_KEY not found in environment. Set STRIPE_API_KEY before running this script.")

# NEW PRICE IDs (the prices you want everyone to move to)
# Preferably set these in your env (or export before running). Example names used below:
# STRIPE_PRICE_ID_FOUNDATION_NEW, STRIPE_PRICE_ID_THERAPEUTIC_NEW, STRIPE_PRICE_ID_COMPREHENSIVE_NEW
NEW_PRICE_IDS = {
    "foundation": os.environ.get("STRIPE_PRICE_ID_FOUNDATION_NEW"),
    "therapeutic": os.environ.get("STRIPE_PRICE_ID_THERAPEUTIC_NEW"),
    "comprehensive": os.environ.get("STRIPE_PRICE_ID_COMPREHENSIVE_NEW"),
}

BATCH_SIZE = int(os.environ.get("MIGRATE_BATCH_SIZE", "50"))
SLEEP_BETWEEN = float(os.environ.get("MIGRATE_SLEEP_BETWEEN", "0.2"))

# Modes: dry_run, immediate_prorate, immediate_noproration, schedule_next_cycle
parser = argparse.ArgumentParser(description="Migrate Stripe subscriptions to new prices")
parser.add_argument("--mode", default="dry_run", choices=["dry_run", "immediate_prorate", "immediate_noproration", "schedule_next_cycle"], help="Migration mode")
parser.add_argument("--tier", default=None, choices=["foundation", "therapeutic", "comprehensive"], help="If supplied, migrate all subscriptions to this tier (useful for testing). If omitted, script will try to pick target price based on mapping or metadata.")
parser.add_argument("--limit", type=int, default=None, help="Limit number of users to process (for testing)")
parser.add_argument("--resume_after", type=int, default=0, help="Skip first N users (useful to resume)")
args = parser.parse_args()

MODE = args.mode
FORCE_TIER = args.tier
LIMIT = args.limit
RESUME_AFTER = args.resume_after

# Helper functions

def get_db():
    return SessionLocal()


def get_users_to_migrate(db, limit=None, offset=0):
    # Only users with a stripe_subscription_id
    q = db.query(models.User).filter(models.User.stripe_subscription_id != None)
    if offset:
        q = q.offset(offset)
    if limit:
        q = q.limit(limit)
    return q.all()


def preview_proration(customer_id, subscription_id, item_id, target_price_id):
    try:
        return stripe.Invoice.upcoming(
            customer=customer_id,
            subscription=subscription_id,
            subscription_items=[{"id": item_id, "price": target_price_id}],
            proration_behavior="create_prorations",
        )
    except Exception as e:
        return {"error": str(e)}


def determine_target_price(sub):
    """Try to infer target price id from subscription metadata/product metadata or fallback to NEW_PRICE_IDS mapping.
    You can adapt this to use your own `_infer_tier_from_subscription` if you have one in your codebase."""
    # If caller forced a tier, return that price id
    if FORCE_TIER:
        return NEW_PRICE_IDS.get(FORCE_TIER)

    # Prefer: price.product.metadata.tier  or price.metadata.tier
    try:
        price = sub["items"]["data"][0]["price"]
        prod = price.get("product")
        # price may be an id string in some webhook cases
        if isinstance(prod, dict):
            meta = prod.get("metadata", {}) or {}
            tier = meta.get("tier") or price.get("metadata", {}).get("tier")
            if tier and NEW_PRICE_IDS.get(tier):
                return NEW_PRICE_IDS[tier]
    except Exception:
        pass

    # fallback heuristic: map by amount (risky) - only if your new prices are set
    try:
        amt = int(price.get("unit_amount") or 0)
        for k, pid in NEW_PRICE_IDS.items():
            # If pid unset skip
            if not pid:
                continue
            # We can't easily inspect price object without API call, so prefer explicit mapping via env.
        # As a final fallback, return None
    except Exception:
        pass

    return None


def migrate_user(db, user):
    sub_id = user.stripe_subscription_id
    if not sub_id:
        return {"skipped": "no_subscription"}
    try:
        sub = stripe.Subscription.retrieve(sub_id, expand=["items.data.price", "items.data.price.product"])
    except Exception as e:
        return {"error": f"failed_retrieve_subscription: {str(e)}"}

    items = (sub.get("items") or {}).get("data", [])
    if not items:
        return {"error": "subscription_has_no_items"}
    item_id = items[0].get("id")

    target_price_id = determine_target_price(sub)
    if not target_price_id:
        return {"error": "no_target_price_id_available"}

    # DRY RUN: preview only
    if MODE == "dry_run":
        up = preview_proration(user.stripe_customer_id or user.email, sub_id, item_id, target_price_id)
        if isinstance(up, dict) and up.get("error"):
            return {"preview_error": up.get("error")}
        amount_due = int(up.get("amount_due") or up.get("total") or 0) if up else None
        return {"preview": True, "amount_due": amount_due}

    # immediate with prorations (create prorations, normal Stripe behavior)
    if MODE == "immediate_prorate":
        try:
            updated = stripe.Subscription.modify(
                sub_id,
                items=[{"id": item_id, "price": target_price_id}],
                proration_behavior="create_prorations",
            )
            # Optionally update local DB conservatively (don't flip tier until invoice.payment_succeeded unless you want immediate flip)
            user.stripe_price_id = target_price_id
            user.stripe_subscription_id = updated.get("id") or user.stripe_subscription_id
            db.add(user); db.commit()
            return {"updated": True, "stripe_subscription": updated.get("id")}
        except Exception as e:
            return {"error": str(e)}

    # immediate without prorations
    if MODE == "immediate_noproration":
        try:
            updated = stripe.Subscription.modify(
                sub_id,
                items=[{"id": item_id, "price": target_price_id}],
                proration_behavior="none",
            )
            user.stripe_price_id = target_price_id
            user.stripe_subscription_id = updated.get("id") or user.stripe_subscription_id
            db.add(user); db.commit()
            return {"updated": True, "stripe_subscription": updated.get("id")}
        except Exception as e:
            return {"error": str(e)}

    # schedule at next cycle using SubscriptionSchedule
    if MODE == "schedule_next_cycle":
        try:
            current_period_end = sub.get("current_period_end")
            if not current_period_end:
                return {"error": "no_current_period_end"}
            start_ts = int(current_period_end) + 1
            schedule = stripe.SubscriptionSchedule.create(
                subscription=sub_id,
                start_date=start_ts,
                end_behavior="release",
                phases=[
                    {"start_date": start_ts, "items": [{"price": target_price_id}], "iterations": None}
                ],
            )
            # Persist the target price id for reconciliation/auditing (but do not flip subscription_tier here)
            user.stripe_price_id = target_price_id
            db.add(user); db.commit()
            return {"scheduled": True, "schedule_id": schedule.get("id")}
        except Exception as e:
            return {"error": str(e)}

    return {"error": "unknown_mode"}


def run_migration():
    db = get_db()
    users = get_users_to_migrate(db, limit=LIMIT, offset=RESUME_AFTER)
    print(f"Found {len(users)} users with subscriptions (limit={LIMIT}, offset={RESUME_AFTER})")
    results = []
    for i, u in enumerate(users):
        try:
            res = migrate_user(db, u)
        except Exception as ex:
            res = {"error": f"exception_in_migrate_user: {str(ex)}"}
        results.append({"user_id": u.id, "result": res})
        if (i + 1) % BATCH_SIZE == 0:
            print(f"Processed {i+1}/{len(users)}; sleeping briefly...")
            time.sleep(2)
        else:
            time.sleep(SLEEP_BETWEEN)

    db.close()
    return results


if __name__ == "__main__":
    print(f"Running migration mode={MODE} (force_tier={FORCE_TIER})")
    if any(v is None for v in NEW_PRICE_IDS.values()):
        print("WARNING: One or more NEW_PRICE_IDS are unset. Ensure environment variables STRIPE_PRICE_ID_*_NEW are set if you expect automatic mapping.")
    out = run_migration()
    success = sum(1 for r in out if r["result"].get("updated") or r["result"].get("scheduled") or r["result"].get("preview"))
    print(f"Done. Processed {len(out)} users; successes (preview/updated/scheduled): {success}")
    # print a small sample of results
    for r in out[:50]:
        print(r)
