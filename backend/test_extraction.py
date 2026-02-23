import sys
from dependencies import SessionLocal
from models.all import Invoice
from services.storage_service import get_file_from_storage
from services.invoice_service import _process_invoice_background
from services.ocr_service import extract_text_from_file
from services.llm_service import extract_invoice_data_with_llm
import json

db = SessionLocal()
invoice_id = "5f634bf2-ff24-4a3c-9bb1-04a8471acfb3"
invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
if not invoice:
    print("Invoice not found")
    sys.exit(1)

print(f"File URL: {invoice.file_url}")
file_bytes, _ = get_file_from_storage(invoice.file_url)

filename = invoice.file_url.split("/")[-1]
raw_text = extract_text_from_file(file_bytes, filename)
print("--- Raw OCR ---")
print(raw_text[:200] + "...")
print("---------------")

print("Extracting with new LLM setup...")
result = extract_invoice_data_with_llm(raw_text)
print(json.dumps(result, indent=2))
db.close()
