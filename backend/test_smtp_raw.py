import smtplib
import os
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

sender = os.getenv("EMAIL_ADDRESS")
password = os.getenv("EMAIL_PASSWORD")
print(f"Loaded credentials for: {sender}")

msg = MIMEText("This is a raw SMTP diagnostic test.", 'plain')
msg['From'] = f"InvoiceAI <{sender}>"
msg['To'] = "ashishmullasserymenon75@gmail.com"
msg['Subject'] = "Raw SMTP Diagnostic"

try:
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        # server.set_debuglevel(1)
        server.login(sender, password)
        server.send_message(msg)
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
