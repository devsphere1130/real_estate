from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_admin, get_db
from app.models import AdminUser
from app.schemas.auth import AdminOut, LoginIn, TokenOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/admin", tags=["admin-auth"])

# Verified against when the email is unknown, so response time does not reveal valid emails.
_DUMMY_HASH = hash_password("not-a-real-password")


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    admin = db.scalar(select(AdminUser).where(AdminUser.email == data.email.lower()))
    ok = verify_password(data.password, admin.password_hash if admin else _DUMMY_HASH)
    if not admin or not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    token, expires_in = create_access_token(str(admin.id))
    return TokenOut(access_token=token, expires_in=expires_in)


@router.get("/me", response_model=AdminOut)
def me(admin: AdminUser = Depends(get_current_admin)):
    return admin
