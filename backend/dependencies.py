from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import urllib.parse

from core.config import settings
from schemas.user import TokenPayload
from models.all import User, UserRole

# Engine setup
db_url = settings.DATABASE_URL

# Normalize postgres:// → postgresql:// (Render quirk)
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Only add sslmode if it's a cloud DB AND sslmode isn't already specified
is_cloud_db = any(h in db_url for h in ["render.com", "neon.tech", "supabase"])
if is_cloud_db and "sslmode" not in db_url:
    db_url += ("&" if "?" in db_url else "?") + "sslmode=require"

# SQLite needs connect_args for thread safety; Postgres needs pool settings
is_sqlite = db_url.startswith("sqlite")
if is_sqlite:
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=3600,
        pool_size=5,
        max_overflow=10,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """Decodes JWT, validates existence, returns the ORM User instance."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == token_data.sub).first()
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Enforces Admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions: Admin required."
        )
    return current_user

def require_client(current_user: User = Depends(get_current_user)) -> User:
    """Enforces Client (or Higher) role."""
    # Since admin is higher, we allow them. If strict routing is needed, check explicitly.
    if current_user.role not in [UserRole.CLIENT, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions."
        )
    return current_user
