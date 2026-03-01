from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# Import Database Base models so SQLAlchemy can create tables
from models.base import Base
from dependencies import engine
from models.all import *

# Import Modular Routers
from api.routes import auth, invoice, admin

# Import Application Hardening Infrastructure
from core.logger import logger
from core.limiter import limiter

from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from services.email_service import fetch_and_process_emails

# Tell SQLAlchemy to physically create tables if they do not exist
Base.metadata.create_all(bind=engine)

def _seed_admin():
    """Auto-create a default admin account on first startup if it doesn't exist."""
    from dependencies import SessionLocal
    from models.all import User, Organization, UserRole
    from core.security import get_password_hash
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "admin@invoiceai.com").first():
            org = db.query(Organization).filter(Organization.name == "InvoiceAI Admin").first()
            if not org:
                org = Organization(name="InvoiceAI Admin")
                db.add(org)
                db.commit()
                db.refresh(org)
            admin = User(
                email="admin@invoiceai.com",
                hashed_password=get_password_hash("Admin123!"),
                role=UserRole.ADMIN,
                organization_id=org.id,
            )
            db.add(admin)
            db.commit()
            logger.info("✅ Default admin account created: admin@invoiceai.com / Admin123!")
        else:
            logger.info("Admin account already exists.")
    except Exception as e:
        logger.error(f"Admin seed failed: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Events
    import os
    import pytesseract
    os.environ["TESSDATA_PREFIX"] = settings.TESSDATA_PREFIX
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    logger.info(f"Tesseract Initialized: {settings.TESSERACT_CMD} (Prefix: {settings.TESSDATA_PREFIX})")
    
    _seed_admin()
    scheduler = BackgroundScheduler()
    scheduler.add_job(fetch_and_process_emails, 'interval', seconds=60, id='email_poll_job')
    scheduler.start()
    logger.info("APScheduler Email Polling started... (Interval: 60s)")
    yield
    # Shutdown Events
    scheduler.shutdown()
    logger.info("APScheduler safely shut down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Apply Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global Exception Handler -> Safely mask stack traces from clients cleanly
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please contact support."}
    )

# CORS Rules
# Combine env-configured origins with always-allowed Vercel preview/production domains
_cors_origins = list(settings.ALLOWED_ORIGINS) + [
    "https://invoice-ai-ashy.vercel.app",
    "https://invoice-ai.vercel.app",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Allow all vercel preview deploys
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Authentication & App Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(invoice.router, prefix=f"{settings.API_V1_STR}/invoices", tags=["invoices"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])

@app.get("/health", tags=["system"])
def health_check():
    """Robust application status check."""
    from sqlalchemy.exc import OperationalError
    from dependencies import SessionLocal
    from core.config import settings

    status = {
        "status": "healthy",
        "api_version": settings.VERSION,
        "db": "disconnected",
        "llm": "configured" if settings.GROQ_API_KEY else "unconfigured"
    }

    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        status["db"] = "connected"
    except Exception as e:
        status["status"] = "degraded"
        status["db"] = f"error: {str(e)}"
    finally:
        db.close()

    return status
