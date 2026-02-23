import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from dependencies import SessionLocal
from models.all import Invoice, InvoiceStatus

db = SessionLocal()

stuck = db.query(Invoice).filter(Invoice.status == InvoiceStatus.PROCESSING).all()
print(f"Found {len(stuck)} stuck invoices.")

for inv in stuck:
    print(f"Releasing invoice {inv.id} to UNDER_REVIEW")
    inv.status = InvoiceStatus.UNDER_REVIEW
    inv.vendor_name = "Recovered From Crash"
    inv.total_amount = 0.0
    
db.commit()
db.close()
