import asyncio
from services.ocr_service import extract_text_from_file

with open("/home/ashish/PROJECTS/PROJECT DESIGN/invoice-ai-cloud/backend/local_uploads/organizations/1e69c902-bf63-4626-82ef-9048477649ce/invoices/2e544148-bd1c-4864-b359-04f1915b9fcf_test_invoice.pdf", "rb") as f:
    text = extract_text_from_file(f.read(), "test.pdf")
    print("--- EXTRACTED TEXT ---")
    print(text)
    print("--- END ---")
