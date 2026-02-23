import sys
from dependencies import SessionLocal
from models.all import Invoice
db = SessionLocal()
invoice_id = "7bac35e6-7b6e-4ef7-85c3-810f82d4ef05"
invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
if invoice:
    print(f"File URL: {invoice.file_url}")
else:
    print("Invoice not found")
sys.stdout.flush()
db.close()
