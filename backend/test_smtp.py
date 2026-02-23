import sys
import logging
import os
logging.basicConfig(level=logging.INFO)

os.environ["ALLOWED_ORIGINS"] = '["http://localhost:3000","http://localhost:3001"]'

from services.email_service import send_status_email

print("Attempting to send a test SMTP outbound email...")
send_status_email("ashishmullasserymenon75@gmail.com", "Test_Manual_Trigger.pdf", "APPROVED", "Global Corp")
print("Finished.")
