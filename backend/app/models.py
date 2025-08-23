# app/models.py
import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Float,
    UniqueConstraint, Index, Enum as SAEnum, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.config import Base  # your existing Base


# ---------- Helpers ----------

def uuid_pk():
    return Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False, unique=True, index=True)

def ts_columns():
    return (
        Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False),
        Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False),
    )


# ---------- Enums ----------

class SubscriptionTier(str, Enum):
    FOUNDATION = "foundation"      # entry tier
    THERAPEUTIC = "therapeutic"          # middle tier
    COMPREHENSIVE = "comprehensive"      # top tier

class SubscriptionStatus(str, Enum):
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"

class ActivityType(str, Enum):
    WALK = "walk"
    MEAL = "meal"
    TRAINING = "training"
    VET_VISIT = "vet_visit"
    MEDICATION = "medication"
    PLAY = "play"
    OTHER = "other"

class TodoStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    SKIPPED = "skipped"

class ProtocolStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


# ---------- Users & Billing ----------

class User(Base):
    __tablename__ = "users"

    id = uuid_pk()
    username = Column(String(80), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # Stripe fields
    stripe_customer_id = Column(String(120), index=True, unique=True)
    # If you support multiple subscriptions later, keep a separate table; for now store current one here too:
    stripe_subscription_id = Column(String(120), index=True, unique=True)
    stripe_price_id = Column(String(120), index=True)  # price for the active tier
    subscription_tier = Column(SAEnum(SubscriptionTier, native_enum=False), nullable=False, default=SubscriptionTier.FOUNDATION)
    subscription_status = Column(SAEnum(SubscriptionStatus, native_enum=False), nullable=False, default=SubscriptionStatus.INCOMPLETE)
    subscription_current_period_end = Column(DateTime(timezone=True))  # for access control
    is_on_trial = Column(Boolean, default=False, nullable=False)

    # housekeeping
    is_active = Column(Boolean, default=True, nullable=False)
    created_at, updated_at = ts_columns()

    # relationships
    dogs = relationship("Dog", back_populates="owner", cascade="all, delete-orphan")
    payments = relationship("PaymentEvent", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_users_email_username", "email", "username"),
    )


class PaymentEvent(Base):
    """
    Immutable log of Stripe webhook events we care about (invoices, payment_intent, subscription updates).
    Useful for reconciliation & debugging.
    """
    __tablename__ = "payment_events"

    id = uuid_pk()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(80), nullable=False)          # e.g., 'invoice.payment_succeeded'
    stripe_object_id = Column(String(120), nullable=False)   # invoice id / payment_intent id / subscription id
    payload = Column(JSON, nullable=True)                    # raw (sanitized) event body
    created_at, updated_at = ts_columns()

    user = relationship("User", back_populates="payments")

    __table_args__ = (
        UniqueConstraint("stripe_object_id", "event_type", name="uq_payment_events_obj_event"),
        Index("ix_payment_events_user_event", "user_id", "event_type"),
    )


# ---------- Dogs & Daily Ops ----------

class Dog(Base):
    __tablename__ = "dogs"

    id = uuid_pk()
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(80), nullable=False)
    breed = Column(String(120))
    sex = Column(String(20))  # "male"/"female"/"neutered"/etc. (or model an enum later)
    date_of_birth = Column(DateTime(timezone=True))
    weight_kg = Column(Float)
    notes = Column(Text)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at, updated_at = ts_columns()

    owner = relationship("User", back_populates="dogs")
    activities = relationship("DogActivity", back_populates="dog", cascade="all, delete-orphan")
    todos = relationship("TodoItem", back_populates="dog", cascade="all, delete-orphan")
    wins = relationship("Win", back_populates="dog", cascade="all, delete-orphan")
    progress_entries = relationship("DogProgressEntry", back_populates="dog", cascade="all, delete-orphan")
    protocol_assignments = relationship("DogProtocol", back_populates="dog", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("owner_id", "name", name="uq_dogs_owner_name"),
    )


class DogActivity(Base):
    __tablename__ = "dog_activities"

    id = uuid_pk()
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False, index=True)

    activity_type = Column(SAEnum(ActivityType, native_enum=False), nullable=False, index=True)
    occurred_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    duration_min = Column(Float)
    calories = Column(Float)
    activity_metadata = Column(JSON)   # <-- renamed from "metadata"
    notes = Column(Text)

    created_at, updated_at = ts_columns()

    dog = relationship("Dog", back_populates="activities")

    __table_args__ = (
        Index("ix_dog_activities_dog_when_type", "dog_id", "occurred_at", "activity_type"),
    )


class TodoItem(Base):
    __tablename__ = "todos"

    id = uuid_pk()
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(SAEnum(TodoStatus, native_enum=False), default=TodoStatus.PENDING, nullable=False, index=True)
    due_at = Column(DateTime(timezone=True))
    priority = Column(Integer, default=0, nullable=False)  # 0=normal; higher = more important
    created_at, updated_at = ts_columns()
    completed_at = Column(DateTime(timezone=True))

    dog = relationship("Dog", back_populates="todos")

    __table_args__ = (
        Index("ix_todos_dog_status_due", "dog_id", "status", "due_at"),
    )


# ---------- Wins, Badges, Achievements ----------

class Badge(Base):
    __tablename__ = "badges"

    id = uuid_pk()
    slug = Column(String(80), unique=True, nullable=False, index=True)  # e.g., "first-walk", "weight-goal-5pct"
    name = Column(String(120), nullable=False)
    description = Column(Text)
    icon = Column(String(255))  # optional CDN path/icon name
    created_at, updated_at = ts_columns()


class Win(Base):
    """
    A specific accomplishment for a dog (may or may not grant a badge).
    """
    __tablename__ = "wins"

    id = uuid_pk()
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)  # e.g., "Completed 7-day protocol", "Reached target weight"
    details = Column(Text)
    occurred_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    created_at, updated_at = ts_columns()

    badge_awards = relationship("DogBadge", back_populates="win", cascade="all, delete-orphan")
    dog = relationship("Dog", back_populates="wins")


class DogBadge(Base):
    """
    A badge awarded to a dog, optionally tied to a Win.
    """
    __tablename__ = "dog_badges"

    id = uuid_pk()
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_id = Column(UUID(as_uuid=True), ForeignKey("badges.id", ondelete="CASCADE"), nullable=False, index=True)
    win_id = Column(UUID(as_uuid=True), ForeignKey("wins.id", ondelete="SET NULL"))
    awarded_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    created_at, updated_at = ts_columns()

    dog = relationship("Dog")
    badge = relationship("Badge")
    win = relationship("Win", back_populates="badge_awards")

    __table_args__ = (
        UniqueConstraint("dog_id", "badge_id", name="uq_dog_badge_once"),
        Index("ix_dog_badges_dog_badge", "dog_id", "badge_id"),
    )


# ---------- Protocols & Assignments ----------

class Protocol(Base):
    """
    Versioned template of steps/instructions (nutrition/training/medication).
    You can keep multiple versions; only ACTIVE ones should be assignable.
    """
    __tablename__ = "protocols"

    id = uuid_pk()
    slug = Column(String(100), unique=True, nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)
    title = Column(String(200), nullable=False)
    summary = Column(Text)
    status = Column(SAEnum(ProtocolStatus, native_enum=False), default=ProtocolStatus.DRAFT, nullable=False, index=True)
    # Structured steps, ingredients, schedules, etc.
    content = Column(JSON, nullable=True)

    created_at, updated_at = ts_columns()

    __table_args__ = (
        UniqueConstraint("slug", "version", name="uq_protocols_slug_version"),
    )


class DogProtocol(Base):
    """
    Assignment of a specific protocol version to a dog (with start/end and progress).
    """
    __tablename__ = "dog_protocols"

    id = uuid_pk()
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False, index=True)
    protocol_id = Column(UUID(as_uuid=True), ForeignKey("protocols.id", ondelete="RESTRICT"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True, nullable=False)

    # Optional personalization overrides
    overrides = Column(JSON)  # e.g., custom feeding schedule, step toggles

    created_at, updated_at = ts_columns()

    dog = relationship("Dog", back_populates="protocol_assignments")
    protocol = relationship("Protocol")

    __table_args__ = (
        Index("ix_dog_protocols_dog_active", "dog_id", "is_active"),
        UniqueConstraint("dog_id", "protocol_id", "started_at", name="uq_dog_protocol_instance"),
    )


# ---------- Progress Tracking ----------

class ProgressMetric(Base):
    """
    Define standardized metrics you want to track (weight, body_condition_score, resting_hr, etc.).
    """
    __tablename__ = "progress_metrics"

    id = uuid_pk()
    key = Column(String(80), unique=True, nullable=False, index=True)  # e.g., "weight_kg"
    name = Column(String(120), nullable=False)                         # e.g., "Weight (kg)"
    unit = Column(String(40))                                          # e.g., "kg", "score", "bpm"
    description = Column(Text)

    created_at, updated_at = ts_columns()


class DogProgressEntry(Base):
    __tablename__ = "dog_progress_entries"

    id = uuid_pk()
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_id = Column(UUID(as_uuid=True), ForeignKey("progress_metrics.id", ondelete="RESTRICT"), nullable=False, index=True)

    value = Column(Float, nullable=False)
    measured_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    notes = Column(Text)
    created_at, updated_at = ts_columns()

    dog = relationship("Dog", back_populates="progress_entries")
    metric = relationship("ProgressMetric")

    __table_args__ = (
        Index("ix_progress_dog_metric_time", "dog_id", "metric_id", "measured_at"),
    )
