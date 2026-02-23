import asyncio
from services.ocr_service import extract_text_from_file

with open("/home/ashish/PROJECTS/PROJECT DESIGN/invoice-ai-cloud/backend/test_receipt.png", "rb") as f:
    text = extract_text_from_file(f.read(), "test.png")
    print("--- EXTRACTED TEXT ---")
    print(text)
    print("--- END ---")
