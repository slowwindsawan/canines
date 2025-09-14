#!/usr/bin/env python3
from sqlalchemy.orm import Session
from sqlalchemy import select, update

"""
manage_users.py

Interactive CLI to create admin user, change password and switch role.
Place this file in your backend root and run:
    python manage_users.py
"""

import os
import sys
import getpass
from typing import Optional

# load dotenv (so DB env vars are available)
from dotenv import load_dotenv

load_dotenv()

# Imports (adjust if your project structure differs)
try:
    from app import models
    from app.config import SessionLocal
except Exception as e:
    print("Error importing app modules. Make sure you run this from your project's root and PYTHONPATH includes the project.")
    print("Import error:", e)
    sys.exit(1)

# Password hashing (bcrypt via passlib)
try:
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception as e:
    print("passlib is required for secure password hashing. Install with:")
    print("    pip install passlib[bcrypt]")
    raise

# Helpers --------------------------------------------------------------------

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def ask_password(prompt: str = "Password: ") -> str:
    while True:
        p1 = getpass.getpass(prompt)
        if not p1:
            print("Password cannot be empty.")
            continue
        p2 = getpass.getpass("Confirm password: ")
        if p1 != p2:
            print("Passwords do not match. Try again.")
            continue
        return p1


def get_user_by_email_or_username(session: Session, identifier: str) -> Optional[models.User]:
    # tries email first then username
    q = session.query(models.User).filter(models.User.email == identifier).first()
    if q:
        return q
    q = session.query(models.User).filter(models.User.username == identifier).first()
    return q


def has_column(colname: str) -> bool:
    """Check if User table has column named `colname`."""
    try:
        return colname in models.User.__table__.columns.keys()
    except Exception:
        return False


# Core operations ------------------------------------------------------------

def create_user_interactive(session: Session):
    print("\n== Create new user ==")
    username = input("username: ").strip()
    if not username:
        print("username required.")
        return

    email = input("email: ").strip()
    if not email:
        print("email required.")
        return

    # check uniqueness
    exists = session.query(models.User).filter(
        (models.User.email == email) | (models.User.username == username)
    ).first()
    if exists:
        print("A user with that email or username already exists:", exists.email, exists.username)
        return

    name = input("display name (optional): ").strip() or ""

    password = ask_password()

    user_kwargs = {
        "username": username,
        "email": email,
        "name": name,
        "hashed_password": hash_password(password),
    }

    # Role handling heuristics
    role_set = False
    if has_column("role"):
        # try to guess admin role value: 'admin' common
        role_val = input("role to assign (default 'admin'): ").strip() or "admin"
        user_kwargs["role"] = role_val
        role_set = True
    elif has_column("is_superuser"):
        user_kwargs["is_superuser"] = True
        role_set = True
    elif has_column("is_admin"):
        user_kwargs["is_admin"] = True
        role_set = True
    else:
        # no explicit role field present in model
        print("NOTE: No role/is_admin/is_superuser column found on User model - user will be created without explicit role flag.")
        print("If you want a DB column to track admin-ness, add it to your model/schema first.")

    # Create user object
    user = models.User(**user_kwargs)
    session.add(user)
    session.commit()
    session.refresh(user)
    print("Created user:", user.id, user.email, "role_set=" + str(role_set))


def change_password_interactive(session: Session):
    print("\n== Change user password ==")
    identifier = input("Enter user's email or username: ").strip()
    user = get_user_by_email_or_username(session, identifier)
    if not user:
        print("User not found.")
        return
    new_password = ask_password("New password: ")
    user.hashed_password = hash_password(new_password)
    session.add(user)
    session.commit()
    print("Password updated for user:", user.email)


def switch_role_interactive(session: Session):
    print("\n== Switch user role ==")
    identifier = input("Enter user's email or username: ").strip()
    user = get_user_by_email_or_username(session, identifier)
    if not user:
        print("User not found.")
        return

    # If role column exists, change it. Otherwise try boolean admin flags.
    if has_column("role"):
        cur = getattr(user, "role", None)
        print("Current role:", cur)
        new_role = input("New role (e.g. 'admin', 'user') : ").strip()
        if not new_role:
            print("No role provided - abort.")
            return
        setattr(user, "role", new_role)
        session.add(user)
        session.commit()
        print("Updated role to:", new_role)
        return

    if has_column("is_superuser") or has_column("is_admin"):
        # toggle or set explicitly
        if has_column("is_superuser"):
            field = "is_superuser"
        else:
            field = "is_admin"
        curval = getattr(user, field, None)
        print(f"Current {field}:", curval)
        choice = input(f"Set {field}? (y/n): ").strip().lower()
        if choice not in ("y", "n"):
            print("Invalid choice, abort.")
            return
        setattr(user, field, True if choice == "y" else False)
        session.add(user)
        session.commit()
        print(f"Updated {field} to {getattr(user, field)}")
        return

    # fallback
    print("No role-like column exists on User model. Cannot switch role. Consider adding a 'role' or 'is_admin' column in your model.")


def list_users(session: Session, limit: int = 50):
    print("\n== Users (first %d) ==" % limit)
    users = session.query(models.User).limit(limit).all()
    if not users:
        print("No users found.")
        return
    for u in users:
        # Try to display common fields
        uid = getattr(u, "id", None)
        email = getattr(u, "email", None)
        username = getattr(u, "username", None)
        role = getattr(u, "role", None) if has_column("role") else None
        is_admin = getattr(u, "is_admin", None) if has_column("is_admin") else None
        is_super = getattr(u, "is_superuser", None) if has_column("is_superuser") else None
        print(f"- id={uid} email={email} username={username} role={role} is_admin={is_admin} is_superuser={is_super}")


# Main loop -----------------------------------------------------------------

def main():
    print("User management CLI")
    print("-------------------\n")
    session = SessionLocal()

    try:
        while True:
            print("\nChoose an action:")
            print("  1) Create new admin user")
            print("  2) Change user password")
            print("  3) Switch user role / admin flag")
            print("  4) List users")
            print("  5) Exit")

            choice = input("Select [1-5]: ").strip()
            if choice == "1":
                create_user_interactive(session)
            elif choice == "2":
                change_password_interactive(session)
            elif choice == "3":
                switch_role_interactive(session)
            elif choice == "4":
                list_users(session)
            elif choice == "5":
                print("Bye.")
                break
            else:
                print("Invalid option.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
