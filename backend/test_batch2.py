import sys
import logging
logging.basicConfig(level=logging.INFO)

# Need to monkey patch the .env loading for this script since our bash environment has corrupted ALLOWED_ORIGINS
import os
os.environ["ALLOWED_ORIGINS"] = '["http://localhost:3000","http://localhost:3001"]'

from services.invoice_service import _process_auto_review_batch
from models.all import Invoice, InvoiceStatus
from dependencies import SessionLocal

print("Starting DB checks...")
db = SessionLocal()
invoices = db.query(Invoice).filter(Invoice.status == InvoiceStatus.UNDER_REVIEW).all()
print(f"Found {len(invoices)} UNDER_REVIEW invoices.")
db.close()

print("Triggering batch function...")
_process_auto_review_batch("admin_ashish_test")
print("Batch function finished.")
