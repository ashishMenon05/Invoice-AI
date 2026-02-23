import sys
import os
sys.path.insert(0, os.path.abspath("."))
from dependencies import SessionLocal
from models.all import Invoice

db = SessionLocal()
invoices_to_delete = db.query(Invoice).filter(Invoice.vendor_name == None).all()
count = len(invoices_to_delete)
for inv in invoices_to_delete:
    db.delete(inv)
db.commit()
print(f"Deleted {count} stalled invoices.")
