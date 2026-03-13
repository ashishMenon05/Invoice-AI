import email
import imaplib
import logging
import re
from email.header import decode_header
from sqlalchemy.orm import Session
import os

from core.config import settings
from models.all import User
from services.invoice_service import log_invoice_event, _process_invoice_background
from models.all import Invoice, InvoiceStatus
from dependencies import SessionLocal
from fastapi import BackgroundTasks

logger = logging.getLogger(__name__)

def connect_imap() -> getattr(imaplib, 'IMAP4_SSL', None):
    """Establishes a secure IMAP connection using environment variables."""
    if not settings.EMAIL_ADDRESS or not settings.EMAIL_PASSWORD:
        logger.warning("Email ingestion skipped: Credentials not configured.")
        return None

    try:
        mail = imaplib.IMAP4_SSL(settings.EMAIL_IMAP_SERVER, settings.EMAIL_IMAP_PORT)
        mail.login(settings.EMAIL_ADDRESS, settings.EMAIL_PASSWORD)
        return mail
    except Exception as e:
        logger.error(f"IMAP Connection failed: {e}")
        return None

def fetch_and_process_emails(background_tasks: BackgroundTasks = None):
    """
    Connects to the IMAP server, searches for UNSEEN emails, and downloads valid attachments.
    Matches the sender address to an enrolled Organization to securely categorize the billing.
    """
    mail = connect_imap()
    if not mail: return

    try:
        mail.select("inbox")
        status, messages = mail.search(None, "UNSEEN")
        
        if status != "OK" or not messages[0]:
            return # No new emails

        for num in messages[0].split():
            _process_single_email(mail, num, background_tasks)

    except Exception as e:
         logger.error(f"Error during IMAP fetching cycle: {e}")
    finally:
        try:
            mail.logout()
        except:
            pass

def _process_single_email(mail, num, background_tasks: BackgroundTasks):
    db: Session = SessionLocal()
    try:
        res, msg_data = mail.fetch(num, "(RFC822)")
        if res != "OK": return

        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1])
                
                # Extract Sender
                sender = msg.get("From")
                match = re.search(r'[\w\.-]+@[\w\.-]+', sender)
                sender_email = match.group(0).lower() if match else None

                if not sender_email:
                    logger.warning("Unparsable sender, skipping.")
                    continue

                # Authenticate Sender
                user = db.query(User).filter(User.email == sender_email).first()
                if not user:
                    logger.info(f"Ignored email from unregistered sender: {sender_email}")
                    # Mark as seen so we don't infinitely retry
                    mail.store(num, '+FLAGS', '\\Seen')
                    continue

                _handle_attachments(msg, user, db, background_tasks)
                
                # Flag as Read
                mail.store(num, '+FLAGS', '\\Seen')

    except Exception as e:
         logger.error(f"Failed processing specific email message: {e}")
    finally:
        db.close()

def _handle_attachments(msg, user: User, db: Session, background_tasks: BackgroundTasks):
     for part in msg.walk():
        if part.get_content_maintype() == "multipart" or part.get("Content-Disposition") is None:
            continue

        filename = part.get_filename()
        if not filename: continue

        # Decode weird email headers
        decoded_header = decode_header(filename)[0]
        if isinstance(decoded_header[0], bytes):
            filename = decoded_header[0].decode(decoded_header[1] or "utf-8")

        # 1. Sanitize Filename securely
        safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '', filename)
        if not safe_filename: safe_filename = "email_attachment.pdf"

        # 2. Strict Extension Validation
        if not safe_filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
             logger.info(f"Skipping incompatible email attachment: {safe_filename}")
             continue

        # 3. Read specific bytes into memory
        file_bytes = part.get_payload(decode=True)
        if not file_bytes: continue
        
        # 3. Size constraints (10 MB MVP Limit)
        if len(file_bytes) > 10 * 1024 * 1024:
             logger.warning(f"Email attachment too large: {len(file_bytes)} bytes.")
             continue

        logger.info(f"Processing valid email attachment: {safe_filename} from {user.email}")
        
        # Step A: Real Storage Integration
        from services.storage_service import save_bytes_to_storage
        storage_key = save_bytes_to_storage(file_bytes, safe_filename, user.organization_id)

        # Step B: Instantiate new Invoice Stub
        new_invoice = Invoice(
            file_url=storage_key,
            status=InvoiceStatus.PROCESSING,
            organization_id=user.organization_id,
            uploaded_by=user.id
        )
        db.add(new_invoice)
        db.commit()
        db.refresh(new_invoice)

        log_invoice_event(db, new_invoice.id, user.id, "RECEIVED_VIA_EMAIL", f"Ingested secure email attachment: {safe_filename}.")

        # Step B: Automated Receipt Confirmation
        try:
            send_status_email(user.email, safe_filename, "RECEIVED")
        except Exception as e:
            logger.error(f"Failed to send receipt confirmation to {user.email}: {e}")

        # Step C: Inject into Background Execution
        if background_tasks:
            background_tasks.add_task(
                _process_invoice_background, 
                new_invoice.id, 
                file_bytes, 
                safe_filename, 
                user.id
            )
        else:
            # Running asynchronously detached from FastAPI Context (e.g., via Scheduler Thread)
            import threading
            threading.Thread(target=_process_invoice_background, args=(
                new_invoice.id, 
                file_bytes, 
                safe_filename, 
                user.id
            )).start()

def send_status_email(to_email: str, invoice_filename: str, status: str, vendor_name: str = None, reason: str = None):
    """
    Sends an automated outbound email notifying the client of an invoice's status change.
    Uses SMTP_SSL for secure transmission over port 465.
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # We fallback to standard generic email settings if dedicated SMTP missing
    smtp_server = os.getenv("EMAIL_SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("EMAIL_SMTP_PORT", 465))
    sender_email = settings.EMAIL_ADDRESS
    sender_password = settings.EMAIL_PASSWORD

    if not sender_email or not sender_password:
        logger.warning(f"Skipping outbound email to {to_email}. Credentials missing.")
        return

    subject_map = {
        "RECEIVED": f"📥 Invoice Received: {invoice_filename}",
        "APPROVED": f"✅ Invoice Approved: {vendor_name or invoice_filename}",
        "AUTO_APPROVED": f"⚡ Invoice Auto-Approved: {vendor_name or invoice_filename}",
        "REJECTED": f"❌ Invoice Rejected: {vendor_name or invoice_filename}",
        "PROCESSING_FAILED": f"⚠️ Processing Failed: {invoice_filename}",
    }

    subject = subject_map.get(status, f"Update on Invoice: {invoice_filename}")
    
    body = f"Hello,\n\nYour recent invoice '{invoice_filename}' "
    if vendor_name:
        body += f"from vendor '{vendor_name}' "
        
    if status == "RECEIVED":
        body += "has been successfully received and is currently being processed by our AI pipeline. You will be notified once a decision is reached."
    elif status in ("APPROVED", "AUTO_APPROVED"):
        body += "has been successfully approved and finalized."
    elif status == "REJECTED":
        body += f"has been rejected by an administrator.\n\nReason: {reason or 'No reason provided.'}"
    elif status == "PROCESSING_FAILED":
        body += "failed to process through our AI pipeline. An administrator has been notified to review the document."

    body += "\n\nYou can view full details by logging into the InvoiceAI Client Dashboard.\n\nBest,\nThe InvoiceAI Team"

    msg = MIMEMultipart()
    msg['From'] = f"InvoiceAI <{sender_email}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
                server.login(sender_email, sender_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                server.send_message(msg)
        logger.info(f"Successfully sent {status} email notification to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
