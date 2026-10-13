"""Create the first admin user. No default password is stored anywhere.

Usage (from /backend):
    python -m scripts.create_admin                 # prompts for email + password
    python -m scripts.create_admin --email me@x.com
"""
import argparse
import getpass
import sys

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import select

from app.database import SessionLocal
from app.models import AdminUser
from app.security import hash_password

MIN_LEN = 10


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a DevSphere admin user")
    parser.add_argument("--email")
    args = parser.parse_args()

    email = args.email or input("Admin email: ").strip()
    try:
        email = validate_email(email, check_deliverability=False).normalized.lower()
    except EmailNotValidError as exc:
        print(f"Invalid email: {exc}")
        return 1

    password = getpass.getpass(f"Password (min {MIN_LEN} chars): ")
    if len(password) < MIN_LEN:
        print(f"Password must be at least {MIN_LEN} characters.")
        return 1
    if password != getpass.getpass("Repeat password: "):
        print("Passwords do not match.")
        return 1

    with SessionLocal() as db:
        if db.scalar(select(AdminUser).where(AdminUser.email == email)):
            print(f"An admin with email {email} already exists.")
            return 1
        db.add(AdminUser(email=email, password_hash=hash_password(password)))
        db.commit()
    print(f"Admin {email} created.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
