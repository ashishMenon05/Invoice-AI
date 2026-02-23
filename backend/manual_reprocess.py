import sys
from dependencies import SessionLocal
from models.all import Invoice, User
from services.invoice_service import _process_invoice_background
from services.storage_service import get_file_from_storage
import os

print("Script started...")
sys.stdout.flush()

try:
    db = SessionLocal()
    print("DB Session created.")
    sys.stdout.flush()
    
    invoice_id = "7bac35e6-7b6c-4ef7-85c3-810f82d4ef05"
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if not invoice:
        print("Invoice not found")
        sys.stdout.flush()
        exit()

    print(f"Found invoice: {invoice.file_url}")
    sys.stdout.flush()
    
    file_bytes, _ = get_file_from_storage(invoice.file_url)
    filename = invoice.file_url.split("/")[-1]
    user_id = invoice.uploaded_by

    print("Starting manual processing...")
    sys.stdout.flush()
    
    _process_invoice_background(invoice.id, file_bytes, filename, user_id)
    print("Manual processing completed.")
    sys.stdout.flush()
    
    db.refresh(invoice)
    print(f"New Status: {invoice.status}")
    print(f"Vendor Name: {invoice.vendor_name}")
    print(f"Confidence Score: {invoice.confidence_score}")
    sys.stdout.flush()
    
except Exception as e:
    print(f"CRITICAL ERROR: {e}")
    sys.stdout.flush()
finally:
    try:
        db.close()
    except:
        pass
