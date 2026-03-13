from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import jwt
import bcrypt
from core.config import settings

def create_access_token(subject: Union[str, Any], roles: list[str], organization_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a JWT Token containing the User ID, their Roles, and their attached Organization."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "roles": roles,
        "org_id": str(organization_id)
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_password_hash(password: str) -> str:
    """Hashes a password with bcrypt and returns the hash as a string."""
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")
