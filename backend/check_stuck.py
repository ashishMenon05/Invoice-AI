import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from dependencies import SessionLocal
from models.all import Invoice, InvoiceEvent

db = SessionLocal()

stuck = db.query(Invoice).filter(Invoice.status == "PROCESSING").all()
print(f"Found {len(stuck)} stuck invoices.")

for inv in stuck:
    print(f"\nInvoice ID: {inv.id}")
    print(f"S3 Key: {getattr(inv, 's3_key', 'N/A')}")
    events = db.query(InvoiceEvent).filter(InvoiceEvent.invoice_id == inv.id).order_by(InvoiceEvent.created_at).all()
    for ev in events:
        print(f"  - {ev.action}: {ev.details}")

db.close()
