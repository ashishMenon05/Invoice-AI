from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Float, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base
import uuid
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CLIENT = "client"

class InvoiceStatus(str, enum.Enum):
    PROCESSING = "processing"
    AUTO_APPROVED = "auto_approved"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ADMIN_PASS_NEEDED = "admin_pass_needed"
    PROCESSING_FAILED = "processing_failed"

class Organization(Base):
    """Root tenant entity. All structural data stems from here."""
    __tablename__ = "organizations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="organization", cascade="all, delete-orphan")
    policy = relationship("OrganizationPolicy", back_populates="organization", uselist=False, cascade="all, delete-orphan")


class OrganizationPolicy(Base):
    """
    Per-tenant approval policy. Auto-created with sane defaults on first
    invoice upload via get_or_create_policy(). Admins can tune via the API.
    """
    __tablename__ = "organization_policies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Approval Thresholds
    auto_approve_confidence_threshold = Column(Float, default=0.95, nullable=False)
    max_auto_approve_amount = Column(Float, default=50000.0, nullable=False)
    high_value_escalation_threshold = Column(Float, default=100000.0, nullable=False)

    # Intelligence Policy Enforcement
    require_review_if_duplicate = Column(Boolean, default=True, nullable=False)
    require_review_if_fraud_flag = Column(Boolean, default=True, nullable=False)
    ai_auto_review_enabled = Column(Boolean, default=False, nullable=False)

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="policy")

class User(Base):
    """Users authenticate into a specific Organization."""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CLIENT, nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    # Profile fields (auto-populated from Google OAuth or manual update)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="users")
    uploaded_invoices = relationship("Invoice", back_populates="uploaded_by_user")

class Invoice(Base):
    """The central invoice logic binding back to users and organizations."""
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_url = Column(String, nullable=True) # R2 S3 Key
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.PROCESSING, nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Processed Output Storage
    vendor_name = Column(String, nullable=True)
    invoice_number = Column(String, nullable=True)
    total_amount = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    extracted_json = Column(JSON, nullable=True) # Full LLM extraction snapshot

    # Validation & Intelligence Flags
    duplicate_flag = Column(Boolean, default=False)
    fraud_flag = Column(Boolean, default=False)
    fraud_score = Column(Float, nullable=True) # 0 to 100
    text_hash = Column(String, nullable=True) # SHA256 of OCR output for matching

    # SLA Metrics
    processing_time_seconds = Column(Float, nullable=True)  # Time from upload to AI completion

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="invoices")
    uploaded_by_user = relationship("User", back_populates="uploaded_invoices")
    events = relationship("InvoiceEvent", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceEvent(Base):
    """Immutable event ledger for SaaS traceablity."""
    __tablename__ = "invoice_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    performed_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # Admin or Client that took action
    event_type = Column(String, nullable=False) # e.g 'UPLOADED', 'REJECTED', 'APPROVED'
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    invoice = relationship("Invoice", back_populates="events")
    performer = relationship("User")
