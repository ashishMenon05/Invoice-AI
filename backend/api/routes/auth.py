from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from schemas.user import UserCreate, UserResponse, Token, GoogleLoginRequest, UserProfileUpdate
from models.all import User, Organization, UserRole
from core.security import get_password_hash, verify_password, create_access_token
from core.config import settings
from dependencies import get_db, get_current_user
from core.limiter import limiter

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new Client user and map them to their Organization.
    If the organziation doesn't exist by name, it is created.
    """
    # Check if user exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists in the system.",
        )
    
    # Handle the Organization logic (Multi-tenant root mapping)
    org = db.query(Organization).filter(Organization.name == user_in.organization_name).first()
    if not org:
        org = Organization(name=user_in.organization_name)
        db.add(org)
        db.commit()
        db.refresh(org)

    # Create the User mapped to the Organization
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        organization_id=org.id,
        # role defaults to CLIENT in model Base
    )
    db.add(new_user)
    db.commit()

    # Eagerly reload with organization so Pydantic serializer can access it
    new_user = db.query(User).options(joinedload(User.organization)).filter(User.id == new_user.id).first()
    return new_user

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login_access_token(
    request: Request, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    OAuth2 compatible token login, gets an access token for future requests.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    access_token = create_access_token(
        subject=user.id,
        roles=[user.role.value],
        organization_id=user.organization_id,
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.post("/google", response_model=Token)
@limiter.limit("5/minute")
def login_google(
    request: Request, 
    login_data: GoogleLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Verifies a Google OAuth Credential (JWT) and exchanges it for an InvoiceAI JWT Access Token.
    Automatically creates a new Organization and User profile if the email is unseen.
    Also always updates full_name and avatar_url from the Google payload on every login.
    """
    try:
        # Verify the Google Credential
        idinfo = id_token.verify_oauth2_token(
            login_data.credential, 
            google_requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )

        email = idinfo['email']
        name = idinfo.get('name', 'Google User')
        avatar_url = idinfo.get('picture', None)  # Google profile picture URL

        # Check if user already exists
        user = db.query(User).filter(User.email == email).first()

        # If User does not exist, provision a new org + user silently
        if not user:
            org_name = f"{name}'s Workspace"
            org = db.query(Organization).filter(Organization.name == org_name).first()
            if not org:
                org = Organization(name=org_name)
                db.add(org)
                db.commit()
                db.refresh(org)
            
            user = User(
                email=email,
                hashed_password=get_password_hash("OAUTH_GOOGLE_PASSWORD_LOCKED"),
                organization_id=org.id,
                full_name=name,
                avatar_url=avatar_url,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Always refresh profile data from Google on each login
            user.full_name = name
            user.avatar_url = avatar_url
            db.commit()

        # Enforce role based on the hardcoded admin email list
        correct_role = UserRole.ADMIN if email in settings.ADMIN_EMAILS else UserRole.CLIENT
        if user.role != correct_role:
            user.role = correct_role
            db.commit()
            db.refresh(user)
            
        if not user.is_active:
             raise HTTPException(status_code=400, detail="Inactive user")

        # Issue custom JWT
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user.id,
            roles=[user.role.value],
            organization_id=user.organization_id,
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
        }

    except ValueError as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    """Gets the current requesting user based on their active JWT."""
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_profile(
    updates: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows a logged-in user to update their display name."""
    if updates.full_name is not None:
        current_user.full_name = updates.full_name
    if updates.avatar_url is not None:
        current_user.avatar_url = updates.avatar_url
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a profile photo for the current user. Stored in R2/local, URL saved to DB."""
    import io, os
    from services.storage_service import get_s3_client, _is_r2_configured, LOCAL_STORAGE_DIR

    allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, or GIF images are accepted.")

    file_bytes = await file.read()
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    s3_key = f"avatars/{current_user.id}/profile.{ext}"

    if _is_r2_configured():
        s3 = get_s3_client()
        bucket_name = os.getenv("R2_BUCKET_NAME", "invoice-ai-bucket")
        s3.put_object(Bucket=bucket_name, Key=s3_key, Body=file_bytes, ContentType=file.content_type)
        public_url = s3_key  # Use key — frontend already calls /invoices/{id}/file pattern
    else:
        # Local dev: save to filesystem and return a data URL for simplicity
        import base64
        public_url = f"data:{file.content_type};base64,{base64.b64encode(file_bytes).decode()}"

    current_user.avatar_url = public_url
    db.commit()
    db.refresh(current_user)
    return current_user
