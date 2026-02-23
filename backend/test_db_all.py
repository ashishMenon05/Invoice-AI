import sys
import os

sys.path.insert(0, os.path.abspath("."))
from dependencies import SessionLocal
from models.all import Invoice

db = SessionLocal()
invoices = db.query(Invoice).all()
print(f"Total invoices in DB: {len(invoices)}")
for inv in invoices:
    if not inv.vendor_name:
        print(f"ID: {inv.id} | Vendor: '{inv.vendor_name}' | Status: {inv.status} | Total: {inv.total_amount}")
