from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from dependencies import get_db, require_client
from models.all import User
from schemas.invoice_schema import InvoiceResponse, InvoiceListResponse
from services.storage_service import get_file_from_storage, generate_r2_key, generate_presigned_put_url, _is_r2_configured
from services.invoice_service import (
    create_invoice_with_background_processing, get_client_invoices, get_client_invoice,
    log_invoice_event
)
from core.limiter import limiter

router = APIRouter()

# --- Notifications ---
@router.get("/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_client)
):
    """
    Returns the 15 most-recently updated invoices for the client's org,
    shaped as notification items for the bell icon in the navbar.
    """
    from models.all import Invoice, InvoiceStatus
    from sqlalchemy import desc
    invoices = (
        db.query(Invoice)
        .filter(Invoice.organization_id == current_user.organization_id)
        .filter(Invoice.status != InvoiceStatus.PROCESSING)  # Only settled statuses
        .order_by(desc(Invoice.updated_at if hasattr(Invoice, "updated_at") else Invoice.created_at))
        .limit(15)
        .all()
    )
    return [
        {
            "id": inv.id,
            "invoice_id": inv.id,
            "vendor": inv.vendor_name or "Invoice",
            "status": inv.status.value if hasattr(inv.status, "value") else str(inv.status),
            "created_at": str(inv.created_at),
        }
        for inv in invoices
    ]


class PresignedUploadRequest(BaseModel):
    filename: str
    content_type: str
    file_size: int = 0


# --- Presigned Upload (browser → R2 directly, bypasses tunnel) ---
@router.post("/presigned-upload")
@limiter.limit("20/minute")
def request_presigned_upload(
    request: Request,
    body: PresignedUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_client)
):
    """
    Step 1 of direct R2 upload flow.
    Returns a presigned PUT URL + pre-created invoice_id.
    The client then PUTs the file bytes DIRECTLY to R2 (no tunnel involved),
    then calls /invoices/{id}/trigger-processing to start OCR.
    """
    import re
    from models.all import Invoice, InvoiceStatus
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '', body.filename) or "unnamed_invoice.pdf"

    valid_extensions = (".pdf", ".png", ".jpg", ".jpeg", ".csv", ".xlsx", ".xls")
    if not safe_filename.lower().endswith(valid_extensions):
        raise HTTPException(status_code=400, detail="Invalid file format.")

    if body.file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")

    r2_key = generate_r2_key(current_user.organization_id, safe_filename)

    # Pre-create DB record so the invoice_id exists before upload
    new_invoice = Invoice(
        file_url=r2_key,
        status=InvoiceStatus.PROCESSING,
        organization_id=current_user.organization_id,
        uploaded_by=current_user.id
    )
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    log_invoice_event(db, new_invoice.id, current_user.id, "UPLOADED", f"Invoice {safe_filename} presigned upload initiated.")

    if not _is_r2_configured():
        # Local dev fallback — use the regular tunnel upload
        return {
            "presigned_url": None,
            "invoice_id": new_invoice.id,
            "r2_key": r2_key,
            "use_fallback": True  # frontend should fall back to multipart upload
        }

    presigned_url = generate_presigned_put_url(r2_key, body.content_type)
    return {
        "presigned_url": presigned_url,
        "invoice_id": new_invoice.id,
        "r2_key": r2_key,
        "use_fallback": False
    }


@router.post("/{invoice_id}/trigger-processing")
@limiter.limit("20/minute")
def trigger_invoice_processing(
    request: Request,
    invoice_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_client)
):
    """
    Step 2 of direct R2 upload flow.
    Called after the browser has ALREADY PUT the file to R2 via presigned URL.
    Downloads the file from R2 and kicks off the OCR + LLM background pipeline.
    """
    from services.invoice_service import _process_invoice_background
    from services.storage_service import get_file_from_storage

    invoice = get_client_invoice(db, invoice_id, current_user.organization_id)
    if not invoice.file_url:
        raise HTTPException(status_code=400, detail="No file URL associated with invoice.")

    try:
        file_bytes, content_type = get_file_from_storage(invoice.file_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch file from storage: {e}")

    filename = invoice.file_url.split("/")[-1]
    log_invoice_event(db, invoice.id, current_user.id, "PROCESSING_QUEUED", "Triggering OCR pipeline after direct R2 upload.")

    if filename.lower().endswith((".csv", ".xlsx", ".xls")):
        from services.spreadsheet_service import process_spreadsheet_background
        background_tasks.add_task(process_spreadsheet_background, invoice.id, file_bytes, filename, current_user.id)
    else:
        background_tasks.add_task(_process_invoice_background, invoice.id, file_bytes, filename, current_user.id)

    return {"invoice_id": invoice.id, "status": "processing_queued"}


# --- Client Routes (legacy multipart — kept as fallback for local dev) ---
@router.post("/upload", response_model=InvoiceResponse)
@limiter.limit("20/minute")
async def upload_invoice(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_client)
):
    """
    Legacy multipart upload — used as fallback when R2 is not configured (local dev).
    For production, use POST /invoices/presigned-upload + PUT to presigned URL.
    """
    return await create_invoice_with_background_processing(
        db, 
        file, 
        current_user.organization_id, 
        current_user.id,
        background_tasks
    )


@router.get("/my", response_model=List[InvoiceListResponse])
def list_my_invoices(
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_client)
):
    """Retrieves all invoices belonging strictly to the user's Organization."""
    return get_client_invoices(db, current_user.organization_id)

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice_details(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_client)
):
    """Retrieves a specific invoice, rigidly assuring the user belongs to its respective Organization."""
    return get_client_invoice(db, invoice_id, current_user.organization_id)

@router.get("/{invoice_id}/status")
def get_invoice_polling_status(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_client)
):
    """
    Lightweight endpoint allowing frontend applications to poll the `PROCESSING` 
    state of active background injections.
    """
    invoice = get_client_invoice(db, invoice_id, current_user.organization_id)
    return {
        "invoice_id": invoice.id,
        "status": invoice.status.value,
        "confidence_score": invoice.confidence_score
    }

from fastapi.responses import Response

@router.get("/{invoice_id}/file")
def get_invoice_file_blob(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_client)
):
    """
    Securely streams the raw physical bytes of the uploaded PDF or Image directly to the UI for Split-Screen Review.
    """
    invoice = get_client_invoice(db, invoice_id, current_user.organization_id)
    if not invoice.file_url:
        raise HTTPException(status_code=404, detail="No storage file associated with this invoice.")
        
    file_bytes, content_type = get_file_from_storage(invoice.file_url)
    
    return Response(content=file_bytes, media_type=content_type)


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_client)
):
    """
    Permanently deletes an invoice (DB record + R2 file) belonging to the user's org.
    Only non-approved invoices can be deleted by clients.
    """
    from models.all import InvoiceStatus
    from services.storage_service import delete_from_storage

    invoice = get_client_invoice(db, invoice_id, current_user.organization_id)
    
    # Safety guard — don't allow deletion of manually approved invoices
    if invoice.status == InvoiceStatus.APPROVED:
        raise HTTPException(status_code=409, detail="Cannot delete a manually approved invoice.")
    
    # Try to delete from R2/storage (best-effort, don't fail if missing)
    if invoice.file_url:
        try:
            delete_from_storage(invoice.file_url)
        except Exception as e:
            pass  # Log but don't block

    db.delete(invoice)
    db.commit()
    return


@router.post("/{invoice_id}/reprocess", response_model=InvoiceResponse)
async def reprocess_invoice(
    invoice_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_client)
):
    """
    Re-triggers the AI extraction pipeline on an invoice stuck in PROCESSING or UNDER_REVIEW.
    Fetches the original file from R2 and re-runs OCR → LLM → Validation.
    """
    from models.all import InvoiceStatus
    from services.invoice_service import _process_invoice_background

    invoice = get_client_invoice(db, invoice_id, current_user.organization_id)

    if not invoice.file_url:
        raise HTTPException(status_code=400, detail="No source file to reprocess.")
    
    if invoice.status == InvoiceStatus.APPROVED:
        raise HTTPException(status_code=409, detail="Cannot reprocess a manually approved invoice.")

    # Fetch the original file bytes from storage
    file_bytes, _ = get_file_from_storage(invoice.file_url)
    filename = invoice.file_url.split("/")[-1]

    # Reset the invoice to processing state
    invoice.status = InvoiceStatus.PROCESSING
    invoice.confidence_score = None
    invoice.vendor_name = None
    invoice.invoice_number = None
    invoice.total_amount = None
    invoice.extracted_json = None
    invoice.duplicate_flag = False
    invoice.fraud_flag = False
    db.commit()
    db.refresh(invoice)

    # Re-run the background AI pipeline
    background_tasks.add_task(_process_invoice_background, invoice.id, file_bytes, filename, current_user.id)

    return invoice
