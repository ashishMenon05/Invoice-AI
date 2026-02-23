from dependencies import SessionLocal
from models.all import Invoice
from services.storage_service import get_file_from_storage
import pytesseract
from PIL import Image
import io
import cv2
import numpy as np

db = SessionLocal()
invoice_id = "5f634bf2-ff24-4a3c-9bb1-04a8471acfb3"
invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
file_bytes, _ = get_file_from_storage(invoice.file_url)

image = Image.open(io.BytesIO(file_bytes))
if image.mode != "RGB":
    image = image.convert("RGB")
    
cv_img = np.array(image)
cv_img = cv_img[:, :, ::-1].copy()
gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
processed_image = Image.fromarray(thresh)

print("--- PSM 3 (Current) ---")
print(pytesseract.image_to_string(processed_image, config=r'--oem 3 --psm 3', timeout=30)[:300])

print("\n--- PSM 4 ---")
print(pytesseract.image_to_string(processed_image, config=r'--oem 3 --psm 4', timeout=30)[:300])

print("\n--- PSM 6 (Block) ---")
print(pytesseract.image_to_string(processed_image, config=r'--oem 3 --psm 6', timeout=30)[:300])

