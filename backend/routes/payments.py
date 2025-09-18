from typing import Optional, Any, Dict, List
from datetime import datetime
import json
import os

from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic_settings import BaseSettings
import stripe
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.config import SessionLocal
from app.dependecies import get_current_user  # ensure this matches your project
from app import models

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Settings(BaseSettings):
    STRIPE_API_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_CURRENCY: str = "usd"

    # When you don't want to maintain Stripe Prices, configure amounts (in cents)
    STRIPE_PLAN_AMOUNT_FOUNDATION: int = 2900        # $29.00
    STRIPE_PLAN_AMOUNT_THERAPEUTIC: int = 6900      # $69.00
    STRIPE_PLAN_AMOUNT_COMPREHENSIVE: int = 14900   # $149.00
    STRIPE_SUCCESS_URL: str = "https://app.thecaninenutritionist.com/login/dashboard"
    STRIPE_CANCEL_URL: str = "https://app.thecaninenutritionist.com/login/dashboard"

    # Optional: canonical Stripe Price IDs (recommended for exact mapping)
    STRIPE_PRICE_ID_FOUNDATION: Optional[str] = None
    STRIPE_PRICE_ID_THERAPEUTIC: Optional[str] = None
    STRIPE_PRICE_ID_COMPREHENSIVE: Optional[str] = None

    # pydantic v2 config...
    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()

# Prefer explicit env fallback so missing .env keys won't crash import-time validation.
stripe_api_key = settings.STRIPE_API_KEY or os.getenv("STRIPE_API_KEY")
stripe_init_error: Optional[str] = None
stripe_available: bool = False
if stripe_api_key:
    stripe.api_key = stripe_api_key
    try:
        # quick validation: try a lightweight call to verify the key (Account.retrieve is minimal)
        stripe.Account.retrieve()
        stripe_available = True
    except Exception as e:
        stripe_init_error = str(e)
        stripe_available = False
        # surface to console during startup so it's obvious
        print(f"[error] Stripe API key invalid or Stripe unreachable: {stripe_init_error}")
else:
    print("[warning] STRIPE_API_KEY not set - Stripe calls will fail until you provide the key via .env or env var.")

router = APIRouter(prefix="/stripe", tags=["stripe"]) 


# ----------------- Helpers -----------------
def _find_user_by_customer_id(db: Session, customer_id: str) -> Optional[models.User]:
    if not customer_id:
        return None
    return db.query(models.User).filter(models.User.stripe_customer_id == customer_id).first()


def _record_payment_event(db: Session, user: Optional[models.User], event_type: str, stripe_object_id: str, payload: Dict[str, Any]):
    # record immutable event for reconciliation/debugging
    try:
        evt = models.PaymentEvent(
            user_id=user.id if user else None,
            event_type=event_type,
            stripe_object_id=stripe_object_id,
            payload=payload,
        )
        db.add(evt)
        db.commit()
    except Exception:
        db.rollback()


def _is_admin(user: "models.User") -> bool:
    """
    Robust admin detection.

    Checks, in order:
      1. Boolean flags: is_admin, is_superuser, is_staff
      2. Role-like columns: role, user_role
         - supports Enum members (.value or .name) or raw strings
         - decodes bytes if needed
      3. Normalizes and compares against a small set of admin labels
    """
    if not user:
        return False

    # 1) boolean flags
    for flag in ("is_admin", "is_superuser", "is_staff"):
        try:
            if getattr(user, flag, False):
                return True
        except Exception:
            # defensive: getattr may raise in some edge cases
            pass

    # 2) role-like fields
    role = getattr(user, "role", None) or getattr(user, "user_role", None)
    if role is None:
        return False

    # If Enum-like, prefer .value then .name, otherwise use the object itself
    val = None
    try:
        if hasattr(role, "value"):
            val = role.value
        elif hasattr(role, "name"):
            val = role.name
        else:
            val = role
    except Exception:
        val = role

    # If bytes, decode
    if isinstance(val, (bytes, bytearray)):
        try:
            val = val.decode("utf-8")
        except Exception:
            pass

    # Normalize to string and compare against admin labels
    try:
        sval = str(val).strip().lower()
    except Exception:
        return False

    admin_labels = {"admin", "administrator", "superuser", "super-admin", "super_admin"}
    return sval in admin_labels


def _attach_user_to_session(db: Session, user: models.User) -> Optional[models.User]:
    """
    Ensure `user` is attached to the provided `db` Session. Returns the instance bound to `db`.
    Uses merge() which copies state into the current session. On error, attempts to refetch the user.
    """
    if user is None:
        return None
    try:
        attached = db.merge(user)
        # flush so DB defaults/constraints are applied and attached object gets any DB-populated fields
        db.flush()
        return attached
    except Exception:
        # fallback: refetch fresh from DB
        try:
            return db.query(models.User).filter(models.User.id == user.id).first()
        except Exception:
            return None


# ----------------- New helpers: infer subscription tier -----------------
def _tier_from_price_obj(price: Dict[str, Any]) -> Optional[models.SubscriptionTier]:
    """Try several heuristics to map a Stripe Price object -> SubscriptionTier."""
    if not price:
        return None

    # 1) Match explicit price.id against configured env price ids
    price_id = price.get("id")
    if price_id:
        if price_id == settings.STRIPE_PRICE_ID_FOUNDATION:
            return models.SubscriptionTier.FOUNDATION
        if price_id == settings.STRIPE_PRICE_ID_THERAPEUTIC:
            return models.SubscriptionTier.THERAPEUTIC
        if price_id == settings.STRIPE_PRICE_ID_COMPREHENSIVE:
            return models.SubscriptionTier.COMPREHENSIVE

    # 2) Match by unit_amount (cents) against configured amounts
    unit_amount = price.get("unit_amount") or price.get("unit_amount_decimal")
    if unit_amount is not None:
        try:
            amt = int(unit_amount)
            if amt == settings.STRIPE_PLAN_AMOUNT_FOUNDATION:
                return models.SubscriptionTier.FOUNDATION
            if amt == settings.STRIPE_PLAN_AMOUNT_THERAPEUTIC:
                return models.SubscriptionTier.THERAPEUTIC
            if amt == settings.STRIPE_PLAN_AMOUNT_COMPREHENSIVE:
                return models.SubscriptionTier.COMPREHENSIVE
        except Exception:
            pass

    # 3) Inspect nickname/product name/metadata
    nickname = (price.get("nickname") or "") if isinstance(price, dict) else ""
    product = price.get("product") if isinstance(price, dict) else None
    product_name = ""
    product_metadata = {}
    if isinstance(product, dict):
        product_name = product.get("name") or ""
        product_metadata = product.get("metadata") or {}
    # metadata on price itself
    price_metadata = price.get("metadata") or {}

    combined = " ".join([str(nickname), str(product_name), str(price_metadata or ""), str(product_metadata or "")]).lower()

    if "foundation" in combined or "foundat" in combined:
        return models.SubscriptionTier.FOUNDATION
    if "therapeutic" in combined or "therapy" in combined:
        return models.SubscriptionTier.THERAPEUTIC
    if "comprehensive" in combined or "comprehens" in combined:
        return models.SubscriptionTier.COMPREHENSIVE

    return None


def _infer_tier_from_subscription(sub: Dict[str, Any]) -> Optional[models.SubscriptionTier]:
    """
    Given a Stripe subscription object (or dict-like), try to infer the SubscriptionTier.
    If items.data[0].price is an ID string, attempt to retrieve the Price object from Stripe
    (only if Stripe configured).
    """
    try:
        price = None
        items = sub.get("items", {}).get("data", [])
        if items:
            price = items[0].get("price")
        if isinstance(price, dict):
            tier = _tier_from_price_obj(price)
            if tier:
                return tier
            # try product expanded inside price
            prod = price.get("product")
            if isinstance(prod, dict):
                prod_combined = (prod.get("name", "") + " " + json.dumps(prod.get("metadata", {}))).lower()
                if "foundation" in prod_combined:
                    return models.SubscriptionTier.FOUNDATION
                if "therapeutic" in prod_combined:
                    return models.SubscriptionTier.THERAPEUTIC
                if "comprehensive" in prod_combined:
                    return models.SubscriptionTier.COMPREHENSIVE
            return None
        elif isinstance(price, str):
            # price is just an ID string — try to fetch price object if possible (best-effort)
            if stripe_available:
                try:
                    price_obj = stripe.Price.retrieve(price, expand=["product"])
                    return _tier_from_price_obj(price_obj)
                except Exception:
                    return None
            return None
        else:
            return None
    except Exception:
        return None


# ----------------- Stripe availability helper -----------------
def _ensure_stripe_available():
    """Raise a helpful HTTPException if Stripe is not configured or key is invalid."""
    if not stripe_available:
        msg = "Stripe not configured"
        if stripe_init_error:
            msg = f"Stripe configuration error: {stripe_init_error}"
        else:
            msg = "Stripe API key missing or not set"
        raise HTTPException(status_code=500, detail=msg)


# ----------------- Public endpoints (existing) -----------------
@router.post("/create-customer")
def create_customer(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Create Stripe customer for the signed-in user (if not exists) and persist stripe_customer_id.

    Returns the Stripe customer object (dict).
    """
    if current_user.stripe_customer_id:
        try:
            cust = stripe.Customer.retrieve(current_user.stripe_customer_id)
            return cust
        except stripe.error.InvalidRequestError:
            # stale id in DB, fall through and recreate
            pass

    _ensure_stripe_available()

    try:
        cust = stripe.Customer.create(
            email=current_user.email,
            name=current_user.name or current_user.username,
            metadata={"local_user_id": str(current_user.id)},
        )
    except stripe.error.AuthenticationError as e:
        # bad API key
        raise HTTPException(status_code=500, detail=f"Stripe authentication error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    attached_user = _attach_user_to_session(db, current_user)
    if not attached_user:
        raise HTTPException(status_code=500, detail="Failed to attach user to session")

    attached_user.stripe_customer_id = cust["id"]
    db.add(attached_user)
    db.commit()
    db.refresh(attached_user)
    return cust


@router.post("/create-checkout-session")
def create_checkout_session(
    price_id: Optional[str] = None,
    plan: Optional[str] = None,
    mode: str = "subscription",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Create a Stripe Checkout session OR perform an in-place subscription swap.
    ...
    """
    dashboard_url = "https://app.thecaninenutritionist.com/dashboard"

    # ensure customer exists (create if missing and Stripe is available)
    if not current_user.stripe_customer_id and stripe_available:
        try:
            cust = stripe.Customer.create(email=current_user.email, name=current_user.name or current_user.username)
        except stripe.error.AuthenticationError as e:
            raise HTTPException(status_code=500, detail=f"Stripe authentication error: {str(e)}")
        except Exception:
            cust = None

        if cust:
            attached_user = _attach_user_to_session(db, current_user)
            if not attached_user:
                raise HTTPException(status_code=500, detail="Failed to attach user to session")
            attached_user.stripe_customer_id = cust["id"]
            db.add(attached_user)
            db.commit()

    def _tier_key(tier_val: Any) -> Optional[str]:
        if not tier_val:
            return None
        try:
            return tier_val.name.lower()
        except Exception:
            try:
                return str(tier_val).lower()
            except Exception:
                return None

    order = {"foundation": 1, "therapeutic": 2, "comprehensive": 3}
    current_tier_key = _tier_key(getattr(current_user, "subscription_tier", None))

    requested_plan_key: Optional[str] = None
    if isinstance(plan, str):
        requested_plan_key = plan.lower()
    elif price_id and stripe_available:
        try:
            price_obj = stripe.Price.retrieve(price_id, expand=["product"])
            inferred = _tier_from_price_obj(price_obj)
            if inferred:
                try:
                    requested_plan_key = inferred.name.lower()
                except Exception:
                    requested_plan_key = str(inferred).lower()
        except Exception:
            requested_plan_key = None

    is_downgrade = False
    is_upgrade = False
    if requested_plan_key and current_tier_key and requested_plan_key in order and current_tier_key in order:
        if order[requested_plan_key] < order[current_tier_key]:
            is_downgrade = True
        elif order[requested_plan_key] > order[current_tier_key]:
            is_upgrade = True

    def _get_or_create_price_for_plan(plan_key: str) -> Optional[str]:
        cfg_name = f"STRIPE_PRICE_ID_{plan_key.upper()}"
        target_price = getattr(settings, cfg_name, None)
        if target_price:
            return target_price
        if not stripe_available:
            return None
        plan_amount_map = {
            "foundation": settings.STRIPE_PLAN_AMOUNT_FOUNDATION,
            "therapeutic": settings.STRIPE_PLAN_AMOUNT_THERAPEUTIC,
            "comprehensive": settings.STRIPE_PLAN_AMOUNT_COMPREHENSIVE,
        }
        amt = plan_amount_map.get(plan_key)
        if not amt:
            return None
        try:
            price_obj = stripe.Price.create(
                unit_amount=int(amt),
                currency=settings.STRIPE_CURRENCY,
                recurring={"interval": "month"} if mode == "subscription" else None,
                product_data={"name": f"{plan_key.capitalize()} Plan"},
            )
            return price_obj["id"]
        except Exception:
            return None

    # ----------------- Downgrade (in-place, non-prorated) -----------------
    if is_downgrade:
        # If Stripe unavailable or user has no stripe subscription -> fallback to local change
        if not stripe_available or not current_user.stripe_subscription_id:
            attached_user = _attach_user_to_session(db, current_user)
            if not attached_user:
                raise HTTPException(status_code=500, detail="Failed to attach user to session")
            # fallback behavior: apply local tier (no Stripe)
            attached_user.subscription_tier = getattr(models.SubscriptionTier, requested_plan_key.upper())
            db.add(attached_user)
            db.commit()
            return {"downgrade": True, "url": dashboard_url, "message": "Downgrade applied locally (no Stripe subscription or Stripe unavailable)."}

        try:
            sub = stripe.Subscription.retrieve(current_user.stripe_subscription_id, expand=["items.data.price"])
            items = sub.get("items", {}).get("data", [])
            if not items:
                attached_user = _attach_user_to_session(db, current_user)
                if attached_user:
                    # record stripe ids if available, but do NOT flip subscription_tier here
                    attached_user.stripe_subscription_id = current_user.stripe_subscription_id
                    db.add(attached_user); db.commit()
                return {"downgrade": True, "url": dashboard_url, "message": "Downgrade recorded locally; Stripe subscription had no items."}

            item_id = items[0].get("id")
            target_price_id = _get_or_create_price_for_plan(requested_plan_key)
            if not target_price_id:
                attached_user = _attach_user_to_session(db, current_user)
                if attached_user:
                    attached_user.stripe_subscription_id = current_user.stripe_subscription_id
                    db.add(attached_user); db.commit()
                return {"downgrade": True, "url": dashboard_url, "message": "Downgrade recorded locally; no target Stripe price available."}

            # perform in-place modify (no proration)
            updated_sub = stripe.Subscription.modify(
                sub["id"],
                items=[{"id": item_id, "price": target_price_id}],
                proration_behavior="none",
            )

            # Persist Stripe ids for reconciliation but DO NOT set subscription_tier — wait for webhook confirmation
            attached_user = _attach_user_to_session(db, current_user)
            if attached_user:
                attached_user.stripe_price_id = target_price_id
                attached_user.stripe_subscription_id = updated_sub.get("id") or attached_user.stripe_subscription_id
                try:
                    pe = updated_sub.get("current_period_end")
                    if pe:
                        attached_user.subscription_current_period_end = datetime.fromtimestamp(int(pe))
                except Exception:
                    pass
                db.add(attached_user)
                db.commit()

            return {
                "downgrade": True,
                "url": dashboard_url,
                "stripe_subscription": updated_sub,
                "message": "Downgrade requested. Change recorded with Stripe; final tier update happens after webhook confirmation.",
            }
        except stripe.error.AuthenticationError as e:
            # fallback local apply if auth fails
            attached_user = _attach_user_to_session(db, current_user)
            if attached_user:
                attached_user.subscription_tier = getattr(models.SubscriptionTier, requested_plan_key.upper())
                db.add(attached_user); db.commit()
            return {"downgrade": True, "url": dashboard_url, "stripe_error": f"Stripe authentication error: {str(e)}"}
        except Exception as e:
            # on unexpected errors, do not leave DB in inconsistent state; fallback to local apply
            attached_user = _attach_user_to_session(db, current_user)
            if attached_user:
                attached_user.subscription_tier = getattr(models.SubscriptionTier, requested_plan_key.upper())
                db.add(attached_user); db.commit()
            return {"downgrade": True, "url": dashboard_url, "error": str(e)}

    # ----------------- Upgrade (preview prorations -> create prorated Checkout payment OR free modify) -----------------
    if is_upgrade:
        if stripe_available and current_user.stripe_subscription_id:
            try:
                sub = stripe.Subscription.retrieve(current_user.stripe_subscription_id, expand=["items.data.price"])
                items = sub.get("items", {}).get("data", [])
                if items:
                    item_id = items[0].get("id")
                    target_price_id = price_id if price_id else _get_or_create_price_for_plan(requested_plan_key)
                    if not target_price_id:
                        # can't determine a target price: fall through to default checkout behavior below
                        pass
                    else:
                        # Preview upcoming invoice with the changed subscription item to compute proration
                        try:
                            upcoming = stripe.Invoice.upcoming(
                                customer=current_user.stripe_customer_id,
                                subscription=sub["id"],
                                subscription_items=[{"id": item_id, "price": target_price_id}],
                                proration_behavior="create_prorations",
                            )
                        except stripe.error.InvalidRequestError:
                            # Stripe couldn't produce an upcoming invoice for the requested change; fallback
                            upcoming = None
                        except Exception:
                            upcoming = None

                        amount_due = 0
                        currency = settings.STRIPE_CURRENCY
                        if upcoming:
                            amount_due = int(upcoming.get("amount_due") or upcoming.get("total") or 0)
                            currency = upcoming.get("currency") or currency

                        # If Stripe reports a positive prorated amount, create a one-off Checkout (payment) for that amount.
                        if upcoming and amount_due > 0:
                            try:
                                session = stripe.checkout.Session.create(
                                    customer=current_user.stripe_customer_id,
                                    payment_method_types=["card"],
                                    mode="payment",
                                    line_items=[
                                        {
                                            "price_data": {
                                                "currency": currency,
                                                "product_data": {
                                                    "name": f"Prorated charge to upgrade to {requested_plan_key.capitalize()}",
                                                },
                                                "unit_amount": amount_due,
                                            },
                                            "quantity": 1,
                                        }
                                    ],
                                    metadata={
                                        "action": "upgrade_proration",
                                        "subscription_id": sub["id"],
                                        "target_price_id": target_price_id,
                                        "user_id": str(current_user.id),
                                    },
                                    success_url=settings.STRIPE_SUCCESS_URL + "?session_id={CHECKOUT_SESSION_ID}",
                                    cancel_url=settings.STRIPE_CANCEL_URL,
                                )
                                sess_url = getattr(session, "url", None) or (session.get("url") if isinstance(session, dict) else None)
                                return {
                                    "upgrade": True,
                                    "id": getattr(session, "id", None) or (session.get("id") if isinstance(session, dict) else None),
                                    "url": sess_url,
                                    "message": "Complete checkout to pay prorated amount and finalize upgrade.",
                                }
                            except stripe.error.AuthenticationError:
                                # fall through to fallback modify/checkout behavior
                                pass
                            except Exception as e:
                                print("Failed to create prorated payment session:", str(e))
                                # fall through to fallback modify/checkout behavior

                        # If no upcoming invoice or amount_due == 0, do an in-place modify (free upgrade)
                        if not upcoming or amount_due == 0:
                            try:
                                updated_sub = stripe.Subscription.modify(
                                    sub["id"],
                                    items=[{"id": item_id, "price": target_price_id}],
                                    proration_behavior="none",
                                )
                                # Persist Stripe ids and --- FOR FREE UPGRADES only --- flip local tier immediately.
                                attached_user = _attach_user_to_session(db, current_user)
                                if attached_user:
                                    attached_user.stripe_price_id = target_price_id
                                    attached_user.stripe_subscription_id = updated_sub.get("id") or attached_user.stripe_subscription_id
                                    try:
                                        pe = updated_sub.get("current_period_end")
                                        if pe:
                                            attached_user.subscription_current_period_end = datetime.fromtimestamp(int(pe))
                                    except Exception:
                                        pass

                                    # NEW: immediately set local subscription_tier for free upgrades (safe — no payment)
                                    try:
                                        if requested_plan_key:
                                            setattr(attached_user, "subscription_tier", getattr(models.SubscriptionTier, requested_plan_key.upper()))
                                    except Exception:
                                        # swallow if mapping fails; leave reconciliation to webhook
                                        pass

                                    db.add(attached_user)
                                    db.commit()

                                return {
                                    "upgrade": True,
                                    "stripe_subscription": updated_sub,
                                    "message": "Upgrade applied (no prorated charge required). Final tier updated locally; webhook will still reconcile. Refresh the page to check your status.",
                                }
                            except Exception as e:
                                print("Failed free-upgrade modify:", str(e))
                                # fall through to checkout fallback below
            except stripe.error.AuthenticationError:
                # fall back to checkout flow below
                pass
            except Exception as e:
                print("Upgrade in-place preview error:", str(e))
                # continue to checkout fallback

        # If no subscription or modify/preview failed, fall through to Checkout (new subscription flow)

    # ----------------- Default / Checkout behavior for new purchases or fallback -----------------
    line_items = None
    if price_id:
        line_items = [{"price": price_id, "quantity": 1}]
    elif plan:
        plan_key = plan.lower()
        plan_amount_map = {
            "foundation": settings.STRIPE_PLAN_AMOUNT_FOUNDATION,
            "therapeutic": settings.STRIPE_PLAN_AMOUNT_THERAPEUTIC,
            "comprehensive": settings.STRIPE_PLAN_AMOUNT_COMPREHENSIVE,
        }
        if plan_key not in plan_amount_map or not plan_amount_map[plan_key]:
            raise HTTPException(status_code=400, detail="Unknown plan or amount not configured on server")
        amount_cents = int(plan_amount_map[plan_key])
        line_items = [
            {
                "price_data": {
                    "currency": settings.STRIPE_CURRENCY,
                    "product_data": {"name": f"{plan_key.capitalize()} Plan"},
                    "unit_amount": amount_cents,
                    "recurring": {"interval": "month"} if mode == "subscription" else None,
                },
                "quantity": 1,
            }
        ]
    else:
        raise HTTPException(status_code=400, detail="Either price_id or plan must be supplied")

    # If Stripe not available, return dashboard
    if not stripe_available:
        return {"id": None, "url": dashboard_url, "message": "Stripe unavailable; redirect to dashboard."}

    try:
        session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id or current_user.email,
            payment_method_types=["card"],
            mode=mode,
            line_items=line_items,
            allow_promotion_codes=True,
            success_url=settings.STRIPE_SUCCESS_URL + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=settings.STRIPE_CANCEL_URL,
        )
        sess_url = getattr(session, "url", None) or (session.get("url") if isinstance(session, dict) else None)
        if not sess_url:
            return {
                "id": getattr(session, "id", None) or (session.get("id") if isinstance(session, dict) else None),
                "url": dashboard_url,
                "message": "No checkout URL returned; redirecting to dashboard.",
            }
        # IMPORTANT: do NOT change any local tier/state here — wait for webhook confirmation after checkout completes.
        return {
            "id": getattr(session, "id", None) or (session.get("id") if isinstance(session, dict) else None),
            "url": sess_url,
            "message": "Checkout created. Final plan change will be applied only after Stripe confirms payment via webhook.",
        }
    except stripe.error.AuthenticationError as e:
        raise HTTPException(status_code=500, detail=f"Stripe authentication error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ----------------- Webhook -----------------
@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    # Construct & verify event
    try:
        if settings.STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=settings.STRIPE_WEBHOOK_SECRET)
        else:
            event = json.loads(payload)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.get("type")
    obj = event.get("data", {}).get("object", {}) or {}

    # find local user by customer id if possible
    customer_id = obj.get("customer") or obj.get("customer_id")
    user = _find_user_by_customer_id(db, customer_id) if customer_id else None

    # record raw event into PaymentEvent for auditing (non-blocking)
    stripe_obj_id = obj.get("id") or event.get("id")
    try:
        _record_payment_event(db, user, event_type, stripe_obj_id or "unknown", obj)
    except Exception:
        # don't fail webhook processing if event recording fails
        pass

    # helper to safely fetch subscription canonical data
    def _fetch_subscription(sub_id: str):
        try:
            return stripe.Subscription.retrieve(sub_id, expand=["items.data.price", "items.data.price.product"])
        except Exception:
            return None

    try:
        # ---- MAIN: only update user's subscription_tier when invoice payment actually succeeded ----
        if event_type == "invoice.payment_succeeded":
            invoice = obj
            subscription_id = invoice.get("subscription") or (invoice.get("lines", {}) or {}).get("data", [{}])[0].get("subscription")
            # invoice is paid (this event guarantees it), so we can treat it as a reliable signal
            if subscription_id and user:
                sub = _fetch_subscription(subscription_id)
                if sub:
                    # canonical price id for the subscription
                    try:
                        price_id = sub["items"]["data"][0]["price"]["id"]
                    except Exception:
                        price_id = None

                    # infer tier from subscription (helper should inspect price/product metadata or ID mapping)
                    inferred_tier = None
                    try:
                        inferred_tier = _infer_tier_from_subscription(sub)
                    except Exception:
                        inferred_tier = None

                    # Only set tier if we can infer a valid tier — this avoids overwriting for unknown prices
                    if inferred_tier:
                        user.subscription_tier = inferred_tier
                        user.stripe_price_id = price_id or user.stripe_price_id
                        user.stripe_subscription_id = sub.get("id") or user.stripe_subscription_id
                        user.subscription_status = models.SubscriptionStatus.ACTIVE
                        try:
                            pe = sub.get("current_period_end")
                            if pe:
                                user.subscription_current_period_end = datetime.fromtimestamp(int(pe))
                        except Exception:
                            pass
                        user.is_on_trial = bool(sub.get("trial_end") and sub.get("trial_status") != "expired")
                        db.add(user)
                        db.commit()
                    else:
                        # Even if we cannot map to a tier, persist stripe ids & status for reconciliation
                        try:
                            user.stripe_price_id = price_id or user.stripe_price_id
                            user.stripe_subscription_id = sub.get("id") or user.stripe_subscription_id
                            user.subscription_status = models.SubscriptionStatus.ACTIVE
                            pe = sub.get("current_period_end")
                            if pe:
                                user.subscription_current_period_end = datetime.fromtimestamp(int(pe))
                            db.add(user)
                            db.commit()
                        except Exception:
                            pass

            # -- optional: log proration/payment details for debugging --
            try:
                pr_info = {}
                pr_info["amount_paid"] = invoice.get("amount_paid") or invoice.get("total")
                pr_info["lines"] = []
                for line in (invoice.get("lines", {}) or {}).get("data", []) or []:
                    if line.get("proration") or line.get("type") == "proration":
                        pr_info["lines"].append({
                            "description": line.get("description"),
                            "amount": line.get("amount"),
                            "period": line.get("period"),
                        })
                if pr_info.get("lines"):
                    print("proration lines detected on invoice.payment_succeeded:", pr_info)
            except Exception:
                pass

            return {"received": True}

        # ---- checkout.session.completed: finalize upgrade_proration if payment was made ----
        elif event_type == "checkout.session.completed":
            session = obj or {}
            try:
                metadata = session.get("metadata") or {}
                action = metadata.get("action")
                # if this session was created for paying a proration, finalize the subscription change
                if action == "upgrade_proration":
                    payment_status = session.get("payment_status")  # expected 'paid'
                    if payment_status == "paid":
                        sub_id = metadata.get("subscription_id")
                        target_price_id = metadata.get("target_price_id")
                        if sub_id and target_price_id and user:
                            try:
                                # fetch subscription to get current item id
                                sub = stripe.Subscription.retrieve(sub_id, expand=["items.data.price"])
                                items = (sub.get("items") or {}).get("data", [])
                                if items:
                                    item_id = items[0].get("id")
                                    # apply the new price but avoid proration because we already charged
                                    updated_sub = stripe.Subscription.modify(
                                        sub_id,
                                        items=[{"id": item_id, "price": target_price_id}],
                                        proration_behavior="none",
                                    )
                                    # update local user immediately because payment is confirmed
                                    try:
                                        inferred_tier = _infer_tier_from_subscription(updated_sub)
                                    except Exception:
                                        inferred_tier = None
                                    if inferred_tier and user:
                                        user.subscription_tier = inferred_tier
                                    if user:
                                        user.stripe_subscription_id = updated_sub.get("id") or user.stripe_subscription_id
                                        try:
                                            price_id = updated_sub["items"]["data"][0]["price"]["id"]
                                            user.stripe_price_id = price_id or user.stripe_price_id
                                        except Exception:
                                            pass
                                        user.subscription_status = models.SubscriptionStatus.ACTIVE
                                        try:
                                            pe = updated_sub.get("current_period_end")
                                            if pe:
                                                user.subscription_current_period_end = datetime.fromtimestamp(int(pe))
                                        except Exception:
                                            pass
                                        db.add(user)
                                        db.commit()
                            except Exception as e:
                                print("Error finalizing upgrade after checkout:", str(e))
                    else:
                        # not paid (rare) - just persist session info for auditing if possible
                        if user:
                            db.add(user); db.commit()
                else:
                    # Normal checkout session for subscription creation — persist stripe ids conservatively
                    subscription_id = session.get("subscription")
                    if subscription_id and user:
                        sub = _fetch_subscription(subscription_id)
                        if sub:
                            try:
                                price_id = sub["items"]["data"][0]["price"]["id"]
                                user.stripe_price_id = price_id or user.stripe_price_id
                            except Exception:
                                pass
                            user.stripe_subscription_id = sub.get("id") or user.stripe_subscription_id
                            if sub.get("status") == "active":
                                user.subscription_status = models.SubscriptionStatus.ACTIVE
                            elif sub.get("status") == "trialing":
                                user.subscription_status = models.SubscriptionStatus.TRIALING

                            # NEW: try to infer and set subscription_tier for newly-created subscriptions
                            try:
                                inferred_tier = _infer_tier_from_subscription(sub)
                            except Exception:
                                inferred_tier = None
                            if inferred_tier:
                                try:
                                    user.subscription_tier = inferred_tier
                                except Exception:
                                    pass

                            db.add(user); db.commit()
            except Exception:
                pass
            return {"received": True}

        # ---- For subscription updates/creates: update stripe ids/status only (no tier flip) ----
        elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
            sub = obj
            if user:
                try:
                    user.stripe_subscription_id = sub.get("id")
                except Exception:
                    pass
                try:
                    price_id = sub["items"]["data"][0]["price"]["id"]
                    user.stripe_price_id = price_id
                except Exception:
                    pass

                status_map = {
                    "active": models.SubscriptionStatus.ACTIVE,
                    "trialing": models.SubscriptionStatus.TRIALING,
                    "past_due": models.SubscriptionStatus.PAST_DUE,
                    "canceled": models.SubscriptionStatus.CANCELED,
                    "incomplete": models.SubscriptionStatus.INCOMPLETE,
                    "incomplete_expired": models.SubscriptionStatus.INCOMPLETE_EXPIRED,
                    "unpaid": models.SubscriptionStatus.UNPAID,
                }
                user.subscription_status = status_map.get(sub.get("status"), models.SubscriptionStatus.INCOMPLETE)
                period_end = sub.get("current_period_end")
                if period_end:
                    try:
                        user.subscription_current_period_end = datetime.fromtimestamp(int(period_end))
                    except Exception:
                        pass

                try:
                    user.is_on_trial = bool(sub.get("trial_end") and sub.get("trial_status") != "expired")
                except Exception:
                    pass

                # NEW: try to infer & set local subscription_tier on subscription.updated/created events
                try:
                    inferred_tier = _infer_tier_from_subscription(sub)
                except Exception:
                    inferred_tier = None
                if inferred_tier:
                    try:
                        user.subscription_tier = inferred_tier
                    except Exception:
                        pass

                db.add(user)
                db.commit()

            return {"received": True}

        # ---- invoice.payment_failed -> keep as before ----
        elif event_type == "invoice.payment_failed":
            if user:
                user.subscription_status = models.SubscriptionStatus.PAST_DUE
                db.add(user)
                db.commit()
            return {"received": True}

        # ---- subscription deletion: clear fields ----
        elif event_type == "customer.subscription.deleted":
            sub = obj
            if user:
                user.subscription_status = models.SubscriptionStatus.CANCELED
                user.stripe_subscription_id = None
                user.stripe_price_id = None
                user.subscription_current_period_end = None
                user.is_on_trial = False
                db.add(user)
                db.commit()
            return {"received": True}

        # ---- customer.updated: sync metadata ----
        elif event_type == "customer.updated":
            if user:
                email = obj.get("email")
                name = obj.get("name")
                if email and user.email != email:
                    user.email = email
                if name and user.name != name:
                    user.name = name
                db.add(user)
                db.commit()
            return {"received": True}

        # Any other events: record and ignore in business logic
        else:
            return {"received": True}

    except Exception as e:
        # don't fail webhook processing for unexpected errors - log in production
        print("Error handling stripe webhook event:", str(e))
        return {"received": True}


#----------------NExt---->
@router.post("/create-portal-session")
def create_billing_portal_session(return_url: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Create a Billing Portal session for the current user.

    The portal lets customers manage billing info and subscriptions.
    """
    _ensure_stripe_available()

    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No stripe customer attached to user")

    try:
        url = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=return_url or settings.STRIPE_SUCCESS_URL,
        )
        return {"url": url.url}
    except stripe.error.AuthenticationError as e:
        raise HTTPException(status_code=500, detail=f"Stripe authentication error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cancel-subscription")
def cancel_subscription(immediate: bool = False, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Cancel the active subscription for the current user. If immediate=True, cancel now; else cancel at period end."""
    _ensure_stripe_available()

    if not current_user.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription found for user")

    try:
        sub = stripe.Subscription.retrieve(current_user.stripe_subscription_id)
        attached_user = _attach_user_to_session(db, current_user)
        if not attached_user:
            raise HTTPException(status_code=500, detail="Failed to attach user to session")

        if immediate:
            canceled = stripe.Subscription.delete(sub.id)
            attached_user.subscription_status = models.SubscriptionStatus.CANCELED
            attached_user.stripe_subscription_id = None
            attached_user.stripe_price_id = None
            attached_user.subscription_current_period_end = None
        else:
            canceled = stripe.Subscription.modify(sub.id, cancel_at_period_end=True)
            attached_user.subscription_status = models.SubscriptionStatus.PAST_DUE if canceled.status == "past_due" else models.SubscriptionStatus.CANCELED

        db.add(attached_user)
        db.commit()
        return {"subscription": canceled}
    except stripe.error.AuthenticationError as e:
        raise HTTPException(status_code=500, detail=f"Stripe authentication error: {str(e)}")
    except stripe.error.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/subscription")
def get_subscription(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _ensure_stripe_available()

    if not current_user.stripe_subscription_id:
        return {
            "local": {"subscription_status": current_user.subscription_status},
            "stripe": None,
            "payment_methods": None,
            "default_card_last4": None,
            "default_payment_method": None,
            "payment_history": None,
        }

    try:
        sub = stripe.Subscription.retrieve(
            current_user.stripe_subscription_id,
            expand=["items.data.price", "items.data.price.product"],
        )

        payment_methods = None
        default_card_last4: Optional[str] = None
        default_payment_method = None  # 👈 new
        invoices = None
        charges = None

        if current_user.stripe_customer_id:
            # List attached payment methods
            payment_methods = stripe.PaymentMethod.list(
                customer=current_user.stripe_customer_id,
                type="card",
                limit=10,
            )

            # Retrieve customer
            try:
                customer = stripe.Customer.retrieve(current_user.stripe_customer_id)
                default_pm_id = getattr(customer.invoice_settings, "default_payment_method", None)
            except Exception:
                default_pm_id = None

            # If a default payment method exists, fetch it
            if default_pm_id:
                try:
                    default_payment_method = stripe.PaymentMethod.retrieve(default_pm_id)
                    default_card_last4 = getattr(getattr(default_payment_method, "card", None), "last4", None)
                except Exception:
                    default_payment_method = None

            # If no default_pm_id, fallback to first card in list
            if not default_card_last4 and payment_methods and getattr(payment_methods, "data", None):
                pm_obj = payment_methods.data[0]
                default_card_last4 = getattr(getattr(pm_obj, "card", None), "last4", None)

            # Invoices
            try:
                invoices = stripe.Invoice.list(
                    customer=current_user.stripe_customer_id,
                    limit=10,
                    expand=["data.payment_intent"],
                )
            except Exception:
                invoices = None

            # Charges
            try:
                charges = stripe.Charge.list(
                    customer=current_user.stripe_customer_id,
                    limit=10,
                )
            except Exception:
                charges = None

        return {
            "local": {
                "subscription_status": current_user.subscription_status,
                "subscription_tier": current_user.subscription_tier,
                "subscription_current_period_end": current_user.subscription_current_period_end,
            },
            "stripe": sub,
            "payment_methods": payment_methods,
            "default_card_last4": default_card_last4,
            "default_payment_method": default_payment_method,  # 👈 new
            "payment_history": {
                "invoices": invoices,
                "charges": charges,
            },
        }

    except stripe.error.AuthenticationError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Stripe authentication error: {str(e)}",
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ----------------- New admin endpoints -----------------
@router.get("/subscribers")
def list_subscribers(
    status: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return list of users who have subscriptions. If `status` supplied, filter by that subscription_status.

    Requires admin-like user (attempts best-effort admin detection).
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="admin access required")

    q = db.query(models.User)
    if status:
        q = q.filter(models.User.subscription_status == status)
    else:
        # default to users who are active or trialing
        q = q.filter(models.User.subscription_status.in_([models.SubscriptionStatus.ACTIVE, models.SubscriptionStatus.TRIALING]))

    users = q.order_by(models.User.created_at.desc()).limit(limit).all()

    result: List[Dict[str, Any]] = []
    for u in users:
        result.append({
            "id": str(u.id),
            "email": u.email,
            "name": getattr(u, "name", None),
            "subscription_tier": getattr(u, "subscription_tier", None),
            "subscription_status": getattr(u, "subscription_status", None),
            "stripe_customer_id": getattr(u, "stripe_customer_id", None),
            "stripe_subscription_id": getattr(u, "stripe_subscription_id", None),
            "subscription_current_period_end": getattr(u, "subscription_current_period_end", None),
            "is_on_trial": getattr(u, "is_on_trial", False),
            "created_at": getattr(u, "created_at", None),
        })

    return {"count": len(result), "data": result}


@router.get("/subscriber-by-email")
def get_subscriber_by_email(
    email: str,
    include_payments: bool = False,
    fetch_stripe: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return subscriber details and optional payment history by email.

    - include_payments: returns records from local PaymentEvent table
    - fetch_stripe: if True and STRIPE_API_KEY is configured, will also fetch Stripe invoices/charges for the Stripe customer
    Requires admin access.
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="admin access required")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")

    payload: Dict[str, Any] = {
        "id": str(user.id),
        "email": user.email,
        "name": getattr(user, "name", None),
        "subscription_tier": getattr(user, "subscription_tier", None),
        "subscription_status": getattr(user, "subscription_status", None),
        "stripe_customer_id": getattr(user, "stripe_customer_id", None),
        "stripe_subscription_id": getattr(user, "stripe_subscription_id", None),
        "subscription_current_period_end": getattr(user, "subscription_current_period_end", None),
        "is_on_trial": getattr(user, "is_on_trial", False),
        "created_at": getattr(user, "created_at", None),
    }

    if include_payments:
        events = db.query(models.PaymentEvent).filter(models.PaymentEvent.user_id == user.id).order_by(desc(models.PaymentEvent.created_at)).all()
        payload["payment_events"] = [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "stripe_object_id": e.stripe_object_id,
                "created_at": e.created_at,
                "payload": e.payload,
            }
            for e in events
        ]

    if fetch_stripe:
        # attempt to fetch from Stripe if configured
        if not stripe_available:
            payload["stripe_error"] = stripe_init_error or "STRIPE_API_KEY not configured on server; cannot fetch Stripe records."
        elif not user.stripe_customer_id:
            payload["stripe_error"] = "user has no stripe_customer_id"
        else:
            try:
                invoices = stripe.Invoice.list(customer=user.stripe_customer_id, limit=100)
                charges = stripe.Charge.list(customer=user.stripe_customer_id, limit=100)
                payload["stripe_invoices"] = invoices.data
                payload["stripe_charges"] = charges.data
            except stripe.error.AuthenticationError as e:
                payload["stripe_error"] = f"Stripe authentication error: {str(e)}"
            except Exception as e:
                payload["stripe_error"] = str(e)

    return payload


@router.get("/payment-events")
def list_payment_events(
    email: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List payment events (local audit log). Optionally filter by user email or event_type.

    Requires admin access.
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="admin access required")

    q = db.query(models.PaymentEvent)
    if email:
        u = db.query(models.User).filter(models.User.email == email).first()
        if not u:
            raise HTTPException(status_code=404, detail="user not found")
        q = q.filter(models.PaymentEvent.user_id == u.id)
    if event_type:
        q = q.filter(models.PaymentEvent.event_type == event_type)

    events = q.order_by(desc(models.PaymentEvent.created_at)).limit(limit).all()

    return {
        "count": len(events),
        "data": [
            {
                "id": str(e.id),
                "user_id": str(e.user_id) if e.user_id else None,
                "event_type": e.event_type,
                "stripe_object_id": e.stripe_object_id,
                "created_at": e.created_at,
                "payload": e.payload,
            }
            for e in events
        ],
    }


@router.get("/subscriptions/stats")
def subscription_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Simple subscription summary (counts by status/tier). Requires admin access."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="admin access required")

    # counts by status
    counts_by_status: Dict[str, int] = {}
    counts_by_tier: Dict[str, int] = {}

    all_users = db.query(models.User).all()
    for u in all_users:
        s = str(u.subscription_status) if u.subscription_status else "unknown"
        t = str(u.subscription_tier) if u.subscription_tier else "none"
        counts_by_status[s] = counts_by_status.get(s, 0) + 1
        counts_by_tier[t] = counts_by_tier.get(t, 0) + 1

    return {"by_status": counts_by_status, "by_tier": counts_by_tier}

# End of file

# ----------------- Stripe-hosted customers (from Stripe API) -----------------
@router.get("/stripe-customers")
def list_stripe_customers(
    limit: int = 100,
    starting_after: Optional[str] = None,
    ending_before: Optional[str] = None,
    email: Optional[str] = None,
    include_subscriptions: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List customers directly from Stripe (not from local DB).

    - limit: max items to return (Stripe max 100 per page).
    - starting_after / ending_before: cursor pagination using customer id.
    - email: if provided, will try to filter locally by customer email (Stripe API doesn't support email filter directly in Customer.list).
    - include_subscriptions: if True, will attach a small list of subscriptions for each customer (requires additional Stripe calls).

    Requires admin access.
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="admin access required")

    _ensure_stripe_available()

    try:
        page_limit = max(1, min(100, int(limit)))
    except Exception:
        page_limit = 100

    params: Dict[str, Any] = {"limit": page_limit}
    if starting_after:
        params["starting_after"] = starting_after
    if ending_before:
        params["ending_before"] = ending_before

    try:
        customers = stripe.Customer.list(**params)
    except stripe.error.AuthenticationError as e:
        raise HTTPException(status_code=500, detail=f"Stripe authentication error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    results: List[Dict[str, Any]] = []

    for c in customers.data:
        cust_email = c.get("email")
        # If email filter provided, skip non-matching
        if email and cust_email and email.lower() != cust_email.lower():
            continue

        entry: Dict[str, Any] = {
            "customer_id": c.get("id"),
            "email": cust_email,
            "name": c.get("name"),
            "created": c.get("created"),
            "metadata": c.get("metadata"),
        }

        if include_subscriptions:
            try:
                subs = stripe.Subscription.list(customer=c.get("id"), limit=100)
                entry["subscriptions"] = [
                    {
                        "id": s.get("id"),
                        "status": s.get("status"),
                        "price": (s.get("items", {}).get("data", [{}])[0].get("price", {}).get("id") if s.get("items") else None),
                        "current_period_start": s.get("current_period_start"),
                        "current_period_end": s.get("current_period_end"),
                    }
                    for s in subs.data
                ]
            except stripe.error.AuthenticationError as e:
                raise HTTPException(status_code=500, detail=f"Stripe authentication error: {str(e)}")
            except Exception as e:
                entry["subscriptions_error"] = str(e)

        results.append(entry)

    return {"count": len(results), "has_more": customers.get("has_more", False), "data": results}

# ----------------- Stripe-hosted subscribers (from Stripe API) -----------------
@router.get("/stripe-subscribers")
def list_stripe_subscribers(
    limit: int = 100,
    status: Optional[str] = None,
    starting_after: Optional[str] = None,
    ending_before: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List subscriptions directly from Stripe (not from local DB).

    - limit: max items to return (Stripe max 100 per page).
    - status: optional Stripe subscription status filter ("all", "active", "trialing", "canceled", etc.).
    - starting_after / ending_before: cursor pagination (use the subscription id returned previously).

    The endpoint expands the customer object when possible so the response includes the customer's email and name when available.
    Requires admin access.
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="admin access required")

    _ensure_stripe_available()

    # limit safety
    try:
        page_limit = max(1, min(100, int(limit)))
    except Exception:
        page_limit = 100

    params: Dict[str, Any] = {"limit": page_limit}
    if status:
        params["status"] = status
    if starting_after:
        params["starting_after"] = starting_after
    if ending_before:
        params["ending_before"] = ending_before

    try:
        subs = stripe.Subscription.list(**params, expand=["data.customer"])
    except stripe.error.AuthenticationError as e:
        raise HTTPException(status_code=500, detail=f"Stripe authentication error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # build lightweight payload (avoid returning raw Stripe objects which may contain sensitive fields)
    data: List[Dict[str, Any]] = []
    for s in subs.data:
        cust = s.get("customer") if isinstance(s.get("customer"), dict) else None
        customer_email = cust.get("email") if cust else None
        customer_name = cust.get("name") if cust else None
        data.append({
            "subscription_id": s.get("id"),
            "status": s.get("status"),
            "price": (s.get("items", {}).get("data", [{}])[0].get("price", {}).get("id") if s.get("items") else None),
            "current_period_end": s.get("current_period_end"),
            "current_period_start": s.get("current_period_start"),
            "customer_id": cust.get("id") if cust else (s.get("customer") if isinstance(s.get("customer"), str) else None),
            "customer_email": customer_email,
            "customer_name": customer_name,
            "created": s.get("created"),
        })

    return {"count": len(data), "has_more": subs.get("has_more", False), "data": data}

@router.post("/stripe/payment-method")
async def update_payment_method(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    body = await request.json()
    payment_method_id = body.get("payment_method_id")

    if not payment_method_id:
        raise HTTPException(status_code=422, detail="payment_method_id is required")

    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="Stripe customer not found.")

    try:
        # If PaymentMethod is not already attached, attach it
        try:
            pm = stripe.PaymentMethod.retrieve(payment_method_id)
        except Exception:
            pm = None

        if pm and pm.customer is None:
            stripe.PaymentMethod.attach(payment_method_id, customer=current_user.stripe_customer_id)

        # Set as default for invoices/subscriptions
        stripe.Customer.modify(
            current_user.stripe_customer_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )

        # Optionally: return the payment method object back to frontend
        try:
            pm_obj = stripe.PaymentMethod.retrieve(payment_method_id)
        except Exception:
            pm_obj = None

        return {"success": True, "new_payment_method_id": payment_method_id, "payment_method": pm_obj}

    except stripe.error.CardError as e:
        raise HTTPException(status_code=400, detail=f"Card error: {str(e)}")
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/setup-intent")
async def create_setup_intent(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Creates a Stripe SetupIntent for the current user (customer). Frontend uses the `client_secret`
    to render PaymentElement and confirm the SetupIntent client-side.
    """
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="Stripe customer not found.")

    try:
        setup_intent = stripe.SetupIntent.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=["card"],
            usage="off_session",  # off_session since we'll use as default for subscriptions/invoices
        )
        return {"client_secret": setup_intent.client_secret}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
