import sys
import logging
import os

logging.basicConfig(level=logging.INFO)
os.environ["ALLOWED_ORIGINS"] = '["http://localhost:3000","http://localhost:3001"]'

from dependencies import SessionLocal
from models.all import Invoice, InvoiceStatus
from services.invoice_service import _process_auto_review_batch

print("Starting DB checks...")
db = SessionLocal()
invoices = db.query(Invoice).filter(Invoice.status == InvoiceStatus.UNDER_REVIEW).all()
print(f"Found {len(invoices)} UNDER_REVIEW invoices.")
db.close()

print("Triggering batch function...")
_process_auto_review_batch("admin_ashish_test")
print("Batch function finished.")
