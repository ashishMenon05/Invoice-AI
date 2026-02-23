import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
os.environ["ALLOWED_ORIGINS"] = '["http://localhost:3000","http://localhost:3001"]'

from dependencies import SessionLocal
from models.all import Invoice, InvoiceStatus, User
from services.invoice_service import _process_auto_review_batch

print("Starting DB checks...")
db = SessionLocal()
admin = db.query(User).filter(User.email == "ashishmullasserymenon75@gmail.com").first()
if not admin:
    print("Admin not found.")
    sys.exit(1)

print(f"Triggering batch function with Admin {admin.id}...")
db.close()

_process_auto_review_batch(admin.id)
print("Batch function finished.")
