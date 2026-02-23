import sys
import logging
logging.basicConfig(level=logging.INFO)
from services.invoice_service import _process_auto_review_batch
print("Starting...")
_process_auto_review_batch("admin_123")
print("Done")
