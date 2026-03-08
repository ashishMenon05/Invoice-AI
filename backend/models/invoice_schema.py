import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from config import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    vendor_name = Column(String, index=True, nullable=True)
    invoice_number = Column(String, index=True, nullable=True)
    invoice_date = Column(String, nullable=True)
    
    subtotal = Column(Float, nullable=True)
    tax = Column(Float, nullable=True)
    grand_total = Column(Float, nullable=True)
    
    confidence_score = Column(Float, nullable=True)
    status = Column(String, default="pending")  # auto_approved, manual_review, rejected
    
    created_at = Column(DateTime, default=datetime.utcnow)

    line_items = relationship("LineItem", back_populates="invoice", cascade="all, delete-orphan")
    validation_results = relationship("ValidationResult", back_populates="invoice", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="invoice", cascade="all, delete-orphan")

class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    
    description = Column(String, nullable=True)
    quantity = Column(Float, nullable=True)
    unit_price = Column(Float, nullable=True)
    computed_total = Column(Float, nullable=True)

    invoice = relationship("Invoice", back_populates="line_items")

class ValidationResult(Base):
    __tablename__ = "validation_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), unique=True, nullable=False)
    
    math_valid = Column(Boolean, default=False)
    schema_valid = Column(Boolean, default=False)
    rule_valid = Column(Boolean, default=False)
    fraud_score = Column(Float, nullable=True)

    invoice = relationship("Invoice", back_populates="validation_results")

class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    
    action = Column(String, nullable=False) # e.g., "OCR Extracted", "LLM Structured", "Math Validated"
    timestamp = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="audit_logs")
