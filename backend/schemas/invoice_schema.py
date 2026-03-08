from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Any, Dict, List
from models.all import InvoiceStatus

class InvoiceEventSchema(BaseModel):
    id: str
    event_type: str
    message: Optional[str] = None
    performed_by: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class InvoiceListResponse(BaseModel):
    id: str
    file_url: Optional[str]
    status: InvoiceStatus
    organization_id: str
    uploaded_by: Optional[str]
    
    vendor_name: Optional[str]
    invoice_number: Optional[str]
    total_amount: Optional[float]
    confidence_score: Optional[float]
    
    duplicate_flag: bool = False
    fraud_flag: bool = False
    fraud_score: Optional[float]
    text_hash: Optional[str]
    processing_time_seconds: Optional[float]
    
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

class InvoiceResponse(InvoiceListResponse):
    extracted_json: Optional[Dict[str, Any]]
    events: List[InvoiceEventSchema] = []
    
    model_config = ConfigDict(from_attributes=True)
