import io
import time
import pandas as pd
import logging
from sqlalchemy.orm import Session
from models.all import Invoice, InvoiceStatus
from dependencies import SessionLocal
from services.invoice_service import log_invoice_event
import uuid

logger = logging.getLogger(__name__)

def process_spreadsheet_background(invoice_id: str, file_bytes: bytes, filename: str, user_id: str):
    db = SessionLocal()
    _start_time = time.monotonic()
    try:
        # Rehydrate the tracker invoice locally
        tracker_invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not tracker_invoice:
            logger.error(f"Spreadsheet Background Process Misfire: Invoice {invoice_id} missing from DB.")
            return

        log_invoice_event(db, tracker_invoice.id, user_id, "PROCESSING_STARTED", f"Importing structured rows from {filename}.")

        try:
            if filename.lower().endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_bytes))
            else:
                df = pd.read_excel(io.BytesIO(file_bytes))
                
            # Basic mapping heuristic for headers
            cols = [str(c).lower().strip() for c in df.columns]
            
            potential_vendor = ["vendor_name", "vendor", "first_name", "client_name", "company", "supplier"]
            potential_amount = ["total", "amount", "total_amount", "price", "grand_total"]
            potential_number = ["invoice_number", "id", "stock_code", "ref", "invoice_id"]
            potential_date = ["date", "invoice_date", "created_at", "timestamp"]
            
            vendor_col = next((df.columns[cols.index(c)] for c in potential_vendor if c in cols), df.columns[0])
            amount_col = next((df.columns[cols.index(c)] for c in potential_amount if c in cols), None)
            num_col = next((df.columns[cols.index(c)] for c in potential_number if c in cols), None)
            date_col = next((df.columns[cols.index(c)] for c in potential_date if c in cols), None)
            
            if not amount_col:
                headers = ", ".join(df.columns)
                raise Exception(f"Could not find a valid 'amount' column in spreadsheet. Headers found: {headers}")
                
            # Limit the spreadsheet parse in MVP to avoid overwhelming the db during dev
            MAX_ROWS = 500
            if len(df) > MAX_ROWS:
                logger.warning(f"Spreadsheet has {len(df)} rows. Truncating to {MAX_ROWS} for MVP.")
                df = df.head(MAX_ROWS)

            invoices_to_create = []
            total_batch_amount = 0.0
            
            for _, row in df.iterrows():
                try:
                    row_amount = float(row[amount_col]) if pd.notna(row[amount_col]) else 0.0
                except (ValueError, TypeError):
                    row_amount = 0.0
                    
                total_batch_amount += row_amount
                
                new_inv = Invoice(
                    organization_id=tracker_invoice.organization_id,
                    uploaded_by=user_id,
                    status=InvoiceStatus.AUTO_APPROVED,
                    file_url=tracker_invoice.file_url,
                    vendor_name=str(row[vendor_col]) if vendor_col and pd.notna(row[vendor_col]) else "Batch Import",
                    invoice_number=str(row[num_col]) if num_col and pd.notna(row[num_col]) else str(uuid.uuid4())[:8],
                    total_amount=row_amount,
                    confidence_score=1.0, 
                    extracted_json={
                        "invoice_date": str(row[date_col]) if date_col and pd.notna(row[date_col]) else None,
                        "raw_row_data": row.fillna("").to_dict()
                    }
                )
                invoices_to_create.append(new_inv)
                
            # Bulk insert (very fast)
            db.bulk_save_objects(invoices_to_create)
            
            # Update the original tracker invoice to act as the "Batch Summary"
            tracker_invoice.status = InvoiceStatus.AUTO_APPROVED
            tracker_invoice.processing_time_seconds = round(time.monotonic() - _start_time, 2)
            tracker_invoice.vendor_name = f"Spreadsheet Dataset ({len(df)} rows)"
            tracker_invoice.total_amount = total_batch_amount
            
            db.commit()
            log_invoice_event(db, tracker_invoice.id, user_id, "PROCESSING_COMPLETED", f"Successfully imported {len(df)} invoices instantly from spreadsheet structure.")
            
        except Exception as proc_e:
            logger.error(f"Spreadsheet Processing failed for Invoice {tracker_invoice.id}: {proc_e}")
            tracker_invoice.status = InvoiceStatus.UNDER_REVIEW
            tracker_invoice.processing_time_seconds = round(time.monotonic() - _start_time, 2)
            tracker_invoice.vendor_name = f"Failed Spreadsheet: {filename}"
            db.commit()
            log_invoice_event(db, tracker_invoice.id, user_id, "PROCESSING_FAILED", f"Spreadsheet schema parsing failed -> {str(proc_e)}")
            
    finally:
        db.close()
