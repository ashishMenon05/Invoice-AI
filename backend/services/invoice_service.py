from sqlalchemy.orm import Session, defer
from fastapi import UploadFile, HTTPException, BackgroundTasks
import logging
import re
import time

from dependencies import SessionLocal
from models.all import Invoice, InvoiceEvent, InvoiceStatus
from services.storage_service import upload_invoice_to_r2
from services.ocr_service import extract_text_from_file
from services.llm_service import extract_invoice_data_with_llm
from services.validation_service import validate_and_score

logger = logging.getLogger(__name__)

async def create_invoice_with_background_processing(
    db: Session, 
    file: UploadFile, 
    org_id: str, 
    user_id: str, 
    background_tasks: BackgroundTasks
) -> Invoice:
    # 1. Sanitize Filename securely
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '', file.filename)
    if not safe_filename:
        safe_filename = "unnamed_invoice.pdf"

    # 2. Strict Extension & MIME Validation
    valid_extensions = (".pdf", ".png", ".jpg", ".jpeg", ".csv", ".xlsx", ".xls")
    valid_mimes = [
        "application/pdf", "image/png", "image/jpeg", 
        "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        "application/vnd.ms-excel"
    ]
    if not safe_filename.lower().endswith(valid_extensions) or file.content_type not in valid_mimes:
        raise HTTPException(status_code=400, detail="Invalid file format. PDFs, Images, and Spreadsheets only.")
    
    # 3. Size constraints (10 MB MVP Limit)
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")
        
    try:
        # Step 1: Upload to Storage immediately (Sync UX Requirement)
        r2_key = await upload_invoice_to_r2(file, org_id=org_id)
        
        # Rewind file to pass raw bytes to the background task synchronously
        await file.seek(0)
        file_bytes = await file.read()
        
        # Step 2: Initialize DB Processing Ticket
        new_invoice = Invoice(
            file_url=r2_key,
            status=InvoiceStatus.PROCESSING,
            organization_id=org_id,
            uploaded_by=user_id
        )
        db.add(new_invoice)
        db.commit()
        db.refresh(new_invoice)
        
        # Initial Logging
        log_invoice_event(db, new_invoice.id, user_id, "UPLOADED", f"Invoice file {safe_filename} uploaded.")
        log_invoice_event(db, new_invoice.id, user_id, "PROCESSING_QUEUED", "OCR text extraction queued in background.")
        
        # Step 3: Trigger fastapi Background Task
        # Pass the UUID instead of the DB object so the background worker can spawn its own safe session.
        if safe_filename.lower().endswith((".csv", ".xlsx", ".xls")):
            from services.spreadsheet_service import process_spreadsheet_background
            background_tasks.add_task(
                process_spreadsheet_background,
                new_invoice.id,
                file_bytes,
                safe_filename,
                user_id
            )
        else:
            background_tasks.add_task(
                _process_invoice_background, 
                new_invoice.id, 
                file_bytes, 
                safe_filename, 
                user_id
            )
            
        return new_invoice
        
    except Exception as fatal_e:
        logger.error(f"Upload flow failed: {fatal_e}")
        raise HTTPException(status_code=500, detail="Failed to initiate document upload.")

def _process_invoice_background(invoice_id: str, file_bytes: bytes, filename: str, user_id: str):
    """
    Background worker strictly opening its own session so it doesn't block FastAPIs main dependencies.
    """
    db = SessionLocal()
    try:
        # Rehydrate the invoice locally
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            logger.error(f"Background Process Misfire: Invoice {invoice_id} missing from DB.")
            return

        log_invoice_event(db, invoice.id, user_id, "PROCESSING_STARTED", "Starting async OCR extraction.")
        
        _start_time = time.monotonic()
        try:
            # Step 1: OCR Pipeline
            import concurrent.futures
            raw_text = ""
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(extract_text_from_file, file_bytes, filename)
                try:
                    extracted = future.result(timeout=5)
                    if extracted and extracted.strip():
                        raw_text = extracted
                    else:
                        raw_text = "[Blank Document Detected]"
                except concurrent.futures.TimeoutError:
                    logger.warning(f"OCR Extraction timed out for {invoice.id}. Falling back to heuristics.")
                    raw_text = "[OCR Timeout Detected. Use heuristics]"

            if not raw_text.strip():
                raise Exception("Empty OCR result.")
            
            # Step 2: Intelligence & Hashing prep
            from services.intelligence_service import create_text_hash, check_for_duplications, calculate_fraud_signals
            ocr_hash = create_text_hash(raw_text)
            invoice.text_hash = ocr_hash

            # Step 3: LLM Structuring
            json_response = extract_invoice_data_with_llm(raw_text)
            
            # Step 4: Validation Scoring
            score, flags = validate_and_score(json_response)
            
            # Step 5: Map Output
            invoice.extracted_json = json_response
            invoice.confidence_score = score
            invoice.vendor_name = json_response.get("vendor_name")
            invoice.invoice_number = json_response.get("invoice_number")
            
            try:
                # Store numeric total correctly
                invoice.total_amount = float(json_response.get("grand_total") or 0.0)
            except (ValueError, TypeError):
                invoice.total_amount = 0.0

            # Step 6: Intelligence Engine Execution
            is_dupe = check_for_duplications(
                db, 
                invoice.organization_id, 
                ocr_hash, 
                invoice.vendor_name, 
                invoice.invoice_number, 
                invoice.total_amount
            )
            is_fraud, fraud_score, fraud_reasons = calculate_fraud_signals(
                invoice.organization_id, 
                score, 
                invoice.total_amount
            )

            # Apply Flags
            if is_dupe:
                invoice.duplicate_flag = True
                log_invoice_event(db, invoice.id, user_id, "DUPLICATE_DETECTED", "Duplicate traits found against existing organization records.")
                flags.append("System matched this document to an existing record.")

            if is_fraud:
                invoice.fraud_flag = True
                invoice.fraud_score = fraud_score
                f_reasons_str = "; ".join(fraud_reasons)
                log_invoice_event(db, invoice.id, user_id, "FRAUD_SIGNAL", f"Automated heuristics triggered: {f_reasons_str}")
                flags.extend(fraud_reasons)


            # Step 7: Policy Engine — per-org configurable approval rules
            from services.policy_engine import get_or_create_policy, evaluate_policy
            policy = get_or_create_policy(db, invoice.organization_id)

            final_status, policy_reasons, escalate = evaluate_policy(
                policy,
                confidence_score=score,
                total_amount=invoice.total_amount or 0.0,
                is_duplicate=is_dupe,
                is_fraud=is_fraud,
            )
            flags.extend(policy_reasons)

            invoice.status = final_status
            log_message = "Background processing completed successfully."

            if escalate:
                log_invoice_event(db, invoice.id, user_id, "HIGH_VALUE_ESCALATION",
                    f"Invoice amount ${invoice.total_amount:,.2f} exceeds escalation threshold — requires senior review.")

            if final_status == InvoiceStatus.UNDER_REVIEW:
                flag_str = "; ".join(flags)
                log_message += f" Policy routed to UNDER_REVIEW. Reasons: {flag_str}"
                
                # --- AI AUTO REVIEW PIPELINE ---
                if getattr(policy, 'ai_auto_review_enabled', False):
                    from services.ai_auditor_service import perform_ai_auto_review
                    log_invoice_event(db, invoice.id, user_id, "AI_AUDIT_STARTED", "Autonomous AI Auditor began secondary review.")
                    db.commit() # Flush so state is tracked before heavy LLM call
                    
                    new_status, ai_reason, needs_alert = perform_ai_auto_review(db, invoice, raw_text, user_id)
                    invoice.status = new_status
                    
                    # Optional: Import email service
                    from services.email_service import send_status_email
                    
                    doc_name = invoice.file_url.split("/")[-1] if invoice.file_url else "Unknown Document"
                    client_email = invoice.uploaded_by_user.email if invoice.uploaded_by_user else None

                    if new_status == InvoiceStatus.APPROVED:
                        log_invoice_event(db, invoice.id, user_id, "AUTO_APPROVED", f"AI Auditor Override: {ai_reason}")
                        if client_email:
                            send_status_email(client_email, doc_name, "AUTO_APPROVED", invoice.vendor_name)
                    
                    elif new_status == InvoiceStatus.REJECTED:
                        log_invoice_event(db, invoice.id, user_id, "REJECTED", f"AI Auditor Rejected: {ai_reason}")
                        if client_email:
                            send_status_email(client_email, doc_name, "REJECTED", invoice.vendor_name, ai_reason)
                            
                    else:
                        log_invoice_event(db, invoice.id, user_id, "AI_AUDIT_COMPLETED", f"AI Auditor Uncertain -> Needs Human Review: {ai_reason}")

            else:
                log_message += " Policy conditions satisfied → AUTO_APPROVED."
                # Since AI wasn't needed and it auto-approved, alert client
                if invoice.uploaded_by_user and invoice.uploaded_by_user.email:
                    from services.email_service import send_status_email
                    doc_name = invoice.file_url.split("/")[-1] if invoice.file_url else "Unknown Document"
                    send_status_email(invoice.uploaded_by_user.email, doc_name, "AUTO_APPROVED", invoice.vendor_name)

            invoice.processing_time_seconds = round(time.monotonic() - _start_time, 2)
            db.commit()
            log_invoice_event(db, invoice.id, user_id, "PROCESSING_COMPLETED", log_message)

        except Exception as proc_e:
            logger.error(f"Background Processing failed for Invoice {invoice.id}: {proc_e}")
            invoice.status = InvoiceStatus.PROCESSING_FAILED
            invoice.processing_time_seconds = round(time.monotonic() - _start_time, 2)
            db.commit()
            log_invoice_event(db, invoice.id, user_id, "PROCESSING_FAILED", f"Critical AI Fault -> Manual check required. Error: {str(proc_e)}")
            
    finally:
        db.close()

def log_invoice_event(db: Session, invoice_id: str, user_id: str, event_type: str, message: str = None) -> InvoiceEvent:
    event = InvoiceEvent(
        invoice_id=invoice_id,
        performed_by=user_id,
        event_type=event_type,
        message=message
    )
    db.add(event)
    db.commit()
    db.commit()
    return event


def _process_auto_review_batch(admin_id: str):
    """
    Background worker that sweeps ALL globally `UNDER_REVIEW` invoices
    and runs the autonomous AI auditor on them.
    """
    db = SessionLocal()
    try:
        invoices = db.query(Invoice).filter(Invoice.status == InvoiceStatus.UNDER_REVIEW).all()
        if not invoices:
            return

        from services.storage_service import get_file_from_storage
        from services.ocr_service import extract_text_from_file
        from services.email_service import send_status_email
        from services.ai_auditor_service import perform_ai_auto_review
        from core.config import settings

        logger.info(f"Admin {admin_id} triggered global auto-review batch on {len(invoices)} invoices.")

        for invoice in invoices:
            try:
                # 1. We need raw text. Retrieve file bytes and re-extract.
                raw_text = "[Raw text unavailable. Assess purely on JSON Heuristics for Fraud/Formatting]"
                if invoice.file_url:
                    try:
                        file_bytes, _ = get_file_from_storage(invoice.file_url)
                        if file_bytes:
                            filename = invoice.file_url.split("/")[-1]
                            
                            # Execute OCR with a strict timeout to prevent thread lockups
                            import concurrent.futures
                            with concurrent.futures.ThreadPoolExecutor() as executor:
                                future = executor.submit(extract_text_from_file, file_bytes, filename)
                                try:
                                    extracted = future.result(timeout=5)
                                    if extracted and extracted.strip():
                                        raw_text = extracted
                                    else:
                                        raw_text = "[Blank Document Detected]"
                                except concurrent.futures.TimeoutError:
                                    logger.warning(f"OCR Extraction timed out for batch {invoice.id}. Falling back to heuristics.")
                                    raw_text = "[OCR Timeout Detected. Use heuristics]"
                    except Exception as e:
                        logger.warning(f"Skipping OCR for batch {invoice.id} due to storage/parse err: {e}")

                log_invoice_event(db, invoice.id, admin_id, "AI_AUDIT_STARTED", "Admin explicitly triggered batch global Auto-Pilot review.")
                db.commit()

                # 2. Trigger the Groq AI Auditor
                new_status, ai_reason, needs_alert = perform_ai_auto_review(db, invoice, raw_text, admin_id)
                invoice.status = new_status

                # 3. Handle Emails and Logging
                client_email = invoice.uploaded_by_user.email if invoice.uploaded_by_user else None

                if new_status == InvoiceStatus.APPROVED:
                    log_invoice_event(db, invoice.id, admin_id, "AUTO_APPROVED", f"Auto-Pilot Batch Sweep Override: {ai_reason}")
                    if client_email:
                        send_status_email(client_email, filename, "AUTO_APPROVED", invoice.vendor_name)
                        
                elif new_status == InvoiceStatus.REJECTED:
                    log_invoice_event(db, invoice.id, admin_id, "REJECTED", f"Auto-Pilot Batch Sweep Rejected: {ai_reason}")
                    if client_email:
                        send_status_email(client_email, filename, "REJECTED", invoice.vendor_name, ai_reason)
                        
                    # Notification sent securely only to account holder.
                else:
                    log_invoice_event(db, invoice.id, admin_id, "AI_AUDIT_COMPLETED", f"Auto-Pilot Batch sweep Uncertain -> Retained Human Review: {ai_reason}")

                db.commit()

            except Exception as item_e:
                logger.error(f"Failed to auto-process invoice {invoice.id} during batch: {item_e}")
                db.rollback()

    except Exception as e:
        logger.error(f"Global Batch Auto Review Sweep failed: {e}")
    finally:
        db.close()
def get_client_invoices(db: Session, org_id: str):
    return db.query(Invoice).options(defer(Invoice.extracted_json)).filter(Invoice.organization_id == org_id).all()

def get_client_invoice(db: Session, invoice_id: str, org_id: str) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice or invoice.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

def get_all_invoices(db: Session, limit: int = None, skip: int = 0):
    q = db.query(Invoice).options(defer(Invoice.extracted_json)).order_by(Invoice.created_at.desc()).offset(skip)
    if limit:
        q = q.limit(limit)
    return q.all()

def approve_invoice(db: Session, invoice_id: str, admin_id: str) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = InvoiceStatus.APPROVED
    db.commit()
    db.refresh(invoice)
    log_invoice_event(db, invoice.id, admin_id, "APPROVED", "Invoice approved by admin.")
    return invoice

def reject_invoice(db: Session, invoice_id: str, admin_id: str, reason: str) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = InvoiceStatus.REJECTED
    db.commit()
    db.refresh(invoice)
    log_invoice_event(db, invoice.id, admin_id, "REJECTED", f"Invoice rejected: {reason}")
    return invoice
def _run_batch_reprocess_job(admin_id: str, target_ids: list[str] = None):
    """
    Sweeps through failed or uncertain invoices and re-triggers the full processing pipeline.
    If target_ids is provided, only those are processed. Otherwise, it sweeps for all.
    """
    from services.storage_service import get_file_from_storage
    db = SessionLocal()
    
    try:
        if target_ids:
            invoices = db.query(Invoice).filter(Invoice.id.in_(target_ids)).all()
        else:
            invoices = db.query(Invoice).filter(
                Invoice.status.in_([InvoiceStatus.PROCESSING_FAILED, InvoiceStatus.ADMIN_PASS_NEEDED])
            ).all()

        if not invoices:
            logger.info("Batch re-process job: No invoices found matching criteria.")
            return

        logger.info(f"Admin {admin_id} started batch re-process on {len(invoices)} invoices.")

        for invoice in invoices:
            try:
                if not invoice.file_url:
                    continue
                
                # Reset state inside the loop
                invoice.status = InvoiceStatus.PROCESSING
                invoice.confidence_score = None
                invoice.vendor_name = None
                invoice.invoice_number = None
                invoice.total_amount = None
                invoice.extracted_json = None
                invoice.duplicate_flag = False
                invoice.fraud_flag = False
                
                log_invoice_event(db, invoice.id, admin_id, "BATCH_REPROCESS_STARTED", "Starting re-extraction sequence.")
                db.commit()

                # Fetch and Process
                file_bytes, _ = get_file_from_storage(invoice.file_url)
                filename = invoice.file_url.split("/")[-1]
                
                # Execute worker logic
                _process_invoice_background(invoice.id, file_bytes, filename, admin_id)
                
            except Exception as item_e:
                logger.error(f"Failed to re-process invoice {invoice.id} in batch: {item_e}")
                db.rollback()
                try:
                    invoice.status = InvoiceStatus.PROCESSING_FAILED
                    db.commit()
                except:
                    pass

    except Exception as e:
        logger.error(f"Global Batch Re-process job failed: {e}")
    finally:
        db.close()
    logger.info("Batch re-process job completed.")
