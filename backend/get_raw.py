from dependencies import SessionLocal
from models.all import Invoice
from services.storage_service import get_file_from_storage
from services.ocr_service import extract_text_from_file

db = SessionLocal()
invoice_id = "5f634bf2-ff24-4a3c-9bb1-04a8471acfb3"
invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
file_bytes, _ = get_file_from_storage(invoice.file_url)
filename = invoice.file_url.split("/")[-1]
raw_text = extract_text_from_file(file_bytes, filename)
print("--- RAW OCR FULL ---")
print(raw_text)
db.close()
