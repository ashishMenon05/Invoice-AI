from dependencies import SessionLocal
from models.all import Invoice
db = SessionLocal()
count = db.query(Invoice).count()
print(f"Total Invoices in DB: {count}")
db.close()
