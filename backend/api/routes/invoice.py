from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List

from dependencies import get_db, require_client
from models.all import User
from schemas.invoice_schema import InvoiceResponse, InvoiceListResponse
from services.storage_service import get_file_from_storage
from services.invoice_service import (
    create_invoice_with_background_processing, get_client_invoices, get_client_invoice
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


# --- Client Routes ---
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
    Accepts an invoice PDF/Image from a client user, stores it in R2 under their Organization, 
    initializes a PROCESSING record, and spins off AI extraction in the background.
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
