import pytesseract
from PIL import Image
import os

# Create a small dummy image with text
from PIL import ImageDraw
img = Image.new('RGB', (200, 100), color = (255, 255, 255))
d = ImageDraw.Draw(img)
d.text((10,10), "Test Invoice 123", fill=(0,0,0))
img.save('test_ocr.png')

print("Current TESSDATA_PREFIX:", os.environ.get("TESSDATA_PREFIX", "Not Set"))

try:
    text = pytesseract.image_to_string(Image.open('test_ocr.png'))
    print("OCR Result:", text.strip())
except Exception as e:
    print("OCR Failed without prefix:", e)

# Try setting the prefix
os.environ["TESSDATA_PREFIX"] = "/home/ashish/python/share/tessdata"
print("\nTrying with TESSDATA_PREFIX=/home/ashish/python/share/tessdata")
try:
    text = pytesseract.image_to_string(Image.open('test_ocr.png'))
    print("OCR Result:", text.strip())
except Exception as e:
    print("OCR Failed with full path:", e)

# Try setting the parent prefix
os.environ["TESSDATA_PREFIX"] = "/home/ashish/python/share/"
print("\nTrying with TESSDATA_PREFIX=/home/ashish/python/share/")
try:
    text = pytesseract.image_to_string(Image.open('test_ocr.png'))
    print("OCR Result:", text.strip())
except Exception as e:
    print("OCR Failed with parent path:", e)
