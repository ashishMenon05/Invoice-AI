import hashlib
import os
from sqlalchemy.orm import Session
from models.all import Invoice

def create_text_hash(raw_text: str) -> str:
    """Consistently hashes OCR string outputs to find byte-for-byte exact duplicate documents."""
    return hashlib.sha256(raw_text.encode('utf-8')).hexdigest()

def check_for_duplications(db: Session, org_id: str, text_hash: str, vendor_name: str, invoice_number: str, total_amount: float) -> bool:
    """
    Scans the specific organization for identical invoices.
    Triggers true if the exact text hash matches OR if the logical triplicate (vendor + number + amount) matches.
    """
    # 1. Check exact OCR byte matches
    if text_hash:
        match_hash = db.query(Invoice).filter(
            Invoice.organization_id == org_id,
            Invoice.text_hash == text_hash
        ).first()
        if match_hash: return True

    # 2. Check Logical triplet matches (In case OCR reads slightly different pixels but extracts same data)
    if vendor_name and invoice_number and total_amount:
        match_logic = db.query(Invoice).filter(
            Invoice.organization_id == org_id,
            Invoice.vendor_name == vendor_name,
            Invoice.invoice_number == invoice_number,
            Invoice.total_amount == total_amount
        ).first()
        if match_logic: return True

    return False

def calculate_fraud_signals(org_id: str, confidence_score: float, total_amount: float) -> tuple[bool, float, list[str]]:
    """
    Evaluates basic heuristics without heavy ML models.
    Returns: (is_fraudulent: bool, fraud_score: float, flags: list[str])
    """
    reasons = []
    base_score = 0.0
    
    # 1. High Amount Threshold (Default 10,000)
    fraud_limit = float(os.getenv("FRAUD_AMOUNT_THRESHOLD", 10000.0))
    if total_amount and total_amount > fraud_limit:
        reasons.append(f"Amount exceeds organizational threshold (${fraud_limit})")
        base_score += 40.0

    # 2. Low Confidence Extraction 
    if confidence_score is not None and confidence_score < 0.75:
        reasons.append(f"Suspiciously low AI extraction confidence ({confidence_score})")
        base_score += 30.0
        
    # Cap score
    base_score = min(base_score, 100.0)
    
    # Trigger boolean flag if score is high enough
    is_fraud = base_score >= 50.0
    
    return is_fraud, base_score, reasons
