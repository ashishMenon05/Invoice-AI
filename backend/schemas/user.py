from pydantic import BaseModel, EmailStr
from typing import Optional
from models.all import UserRole

# Tokens
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    org_id: Optional[str] = None
    roles: list[str] = []

# Organizations
class OrganizationResponse(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True

# Users
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    organization_name: str # For root tenant registration

class GoogleLoginRequest(BaseModel):
    credential: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: UserRole
    organization: OrganizationResponse
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
