import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "InvoiceAI Cloud Multi-Tenant API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"

    # Hardcoded admin emails — these Google accounts are always promoted to admin on login
    ADMIN_EMAILS: list[str] = ["ashishmullasserymenon75@gmail.com"]

    # Database — defaults to SQLite locally, override via .env on Render
    DATABASE_URL: str = "sqlite:///./invoiceai_local.db"

    # Security & Authentication
    SECRET_KEY: str = "SUPER_SECRET_DEVELOPMENT_KEY_PLEASE_CHANGE"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 Days for MVP convenience

    # 3rd Party
    GROQ_API_KEY: str = ""
    R2_ACCESS_KEY: str = ""
    R2_SECRET_KEY: str = ""
    R2_ENDPOINT_URL: str = ""

    # Email Integration
    EMAIL_ADDRESS: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_IMAP_SERVER: str = "imap.gmail.com"
    EMAIL_IMAP_PORT: int = 993
    GOOGLE_CLIENT_ID: str = ""

    # OCR / Tesseract
    TESSDATA_PREFIX: str = "/home/ashish/python/share/tessdata/"
    TESSERACT_CMD: str = "/home/ashish/python/bin/tesseract"

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
