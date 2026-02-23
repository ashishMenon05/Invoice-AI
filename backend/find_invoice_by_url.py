from dependencies import SessionLocal
from models.all import Invoice
db = SessionLocal()
file_path_part = "d2fce64d-e960-47f8-a466-4b06db18b59b_batch3-0989.jpg"
invoice = db.query(Invoice).filter(Invoice.file_url.contains(file_path_part)).first()
if invoice:
    print(f"ID: {invoice.id}, Status: {invoice.status.value}, Org: {invoice.organization_id}")
else:
    print("Invoice not found")
db.close()
