from fastapi import APIRouter, Depends, Form, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from dependencies import get_db, require_admin
from models.all import User, OrganizationPolicy
from schemas.invoice_schema import InvoiceResponse
from services.invoice_service import (
    get_all_invoices, approve_invoice, reject_invoice, log_invoice_event,
    _process_invoice_background
)
from services.analytics_service import get_analytics
from services.policy_engine import get_or_create_policy
from services.email_service import fetch_and_process_emails, send_status_email
from services.storage_service import get_file_from_storage

router = APIRouter()

# ── Pydantic schema for policy update ─────────────────────────────────────────
class PolicyUpdate(BaseModel):
    auto_approve_confidence_threshold: Optional[float] = None
    max_auto_approve_amount: Optional[float] = None
    high_value_escalation_threshold: Optional[float] = None
    require_review_if_duplicate: Optional[bool] = None
    require_review_if_fraud_flag: Optional[bool] = None
    ai_auto_review_enabled: Optional[bool] = None

@router.get("/analytics")
def admin_analytics(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Returns aggregated operational metrics for the Executive Dashboard."""
    return get_analytics(db)


@router.get("/invoices")
def admin_list_invoices(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
    limit: Optional[int] = Query(50, description="Max invoices to return"),
    skip: int = Query(0, description="Offset for pagination"),
):
    """Admin-only view to retrieve all invoices across all organizations (paginated)."""
    from models.all import Invoice
    total = db.query(Invoice).count()
    items = get_all_invoices(db, limit=limit, skip=skip)
    
    # We serialize the items to match InvoiceResponse manually or use fastapi response model list inside a wrapper.
    # Since we are returning a dict, we just let FastAPI encode the ORM objects if they match schemas.
    return {
        "items": items,
        "total": total
    }

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def admin_get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Admin-only view for a specific invoice."""
    from models.all import Invoice
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.post("/invoices/{invoice_id}/approve", response_model=InvoiceResponse)
def admin_approve_invoice(
    invoice_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Admin-only action to approve an invoice and log the event."""
    from services.email_service import send_status_email
    inv = approve_invoice(db, invoice_id, current_admin.id)
    
    if inv.uploaded_by_user and inv.uploaded_by_user.email:
        background_tasks.add_task(
            send_status_email,
            inv.uploaded_by_user.email,
            inv.file_url.split("/")[-1] if inv.file_url else "Unknown Document",
            "APPROVED",
            inv.vendor_name
        )
    return inv

@router.post("/invoices/{invoice_id}/reject", response_model=InvoiceResponse)
def admin_reject_invoice(
    invoice_id: str,
    background_tasks: BackgroundTasks,
    reason: str = Form(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Admin-only action to reject an invoice and securely record the audit reason."""
    from services.email_service import send_status_email
    inv = reject_invoice(db, invoice_id, current_admin.id, reason)
    
    if inv.uploaded_by_user and inv.uploaded_by_user.email:
        background_tasks.add_task(
            send_status_email,
            inv.uploaded_by_user.email,
            inv.file_url.split("/")[-1] if inv.file_url else "Unknown Document",
            "REJECTED",
            inv.vendor_name,
            reason
        )
    return inv

@router.post("/invoices/reprocess-failed")
def reprocess_failed_batch(
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(require_admin)
):
    """
    Triggers a background sweep to re-process all failed or uncertain invoices.
    Returns immediately to avoid timeouts and CORS issues.
    """
    from services.invoice_service import _run_batch_reprocess_job
    
    # Queue the heavy work in the background immediately
    background_tasks.add_task(_run_batch_reprocess_job, current_admin.id)
    
    return {"message": "Batch re-extraction triggered for all failed/uncertain invoices. Check the queue for progress."}

@router.post("/invoices/auto-review-batch")
def auto_review_batch(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Trigger an asynchronous sweep of all queued invoices using the autonomous AI."""
    from services.invoice_service import _process_auto_review_batch
    background_tasks.add_task(_process_auto_review_batch, current_admin.id)
    return {"message": "Auto-Review Batch processing started in background."}

@router.post("/invoices/{invoice_id}/auto-review")
def auto_review_single(
    invoice_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Executes the AI Auditor on a single invoice and natively routes & emails the decision on success."""
    from models.all import Invoice, InvoiceStatus
    from services.ai_auditor_service import perform_ai_auto_review
    from services.storage_service import get_file_from_storage
    import services.ocr_service as ocr_service
    from services.invoice_service import approve_invoice, reject_invoice
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if invoice.status != InvoiceStatus.UNDER_REVIEW:
        return {"result": "SKIPPED", "reason": f"Invoice is not in UNDER_REVIEW state, it is {invoice.status.value}"}

    # Fetch document so the LLM has OCR text
    try:
        file_bytes, _ = get_file_from_storage(invoice.file_url)
        raw_text = ocr_service.extract_text_from_file(file_bytes, invoice.file_url.split("/")[-1])
    except Exception as e:
        invoice.status = InvoiceStatus.ADMIN_PASS_NEEDED
        db.commit()
        return {"result": "ADMIN_PASS_NEEDED", "reason": f"Failed to acquire file or OCR: {str(e)}"}

    new_status, reason, needs_admin_alert = perform_ai_auto_review(db, invoice, raw_text, current_admin.id)

    # Route logic based on AI decision
    if new_status == InvoiceStatus.APPROVED:
        approve_invoice(db, invoice.id, current_admin.id)
        from services.email_service import send_status_email
        if invoice.uploaded_by_user and invoice.uploaded_by_user.email:
            background_tasks.add_task(
                send_status_email,
                invoice.uploaded_by_user.email,
                invoice.file_url.split("/")[-1] if invoice.file_url else "Invoice",
                "APPROVED",
                invoice.vendor_name
            )
        return {"result": "APPROVED", "reason": reason}
        
    elif new_status == InvoiceStatus.REJECTED:
        reject_invoice(db, invoice.id, current_admin.id, f"AI Auto-Review Rejection: {reason}")
        from services.email_service import send_status_email
        if invoice.uploaded_by_user and invoice.uploaded_by_user.email:
            background_tasks.add_task(
                send_status_email,
                invoice.uploaded_by_user.email,
                invoice.file_url.split("/")[-1] if invoice.file_url else "Invoice",
                "REJECTED",
                invoice.vendor_name,
                reason
            )
        # Check if fraud alert to admins is needed (handled lightly here)
        if needs_admin_alert:
            admin_emails = [u.email for u in db.query(User).filter(User.role == "admin").all() if u.email]
            for email in admin_emails:
                 background_tasks.add_task(
                     send_status_email,
                     email,
                     invoice.file_url.split("/")[-1] if invoice.file_url else "Invoice",
                     "FRAUD_ALERT",
                     invoice.vendor_name,
                     f"URGENT FRAUD INTERCEPTION: {reason}"
                 )
        return {"result": "REJECTED", "reason": reason}
        
    # If uncertain, we change state to admin_pass_needed so AutoPilot skips it.
    invoice.status = InvoiceStatus.ADMIN_PASS_NEEDED
    db.commit()
    return {"result": "ADMIN_PASS_NEEDED", "reason": reason}

@router.get("/invoices/{invoice_id}/file")
def admin_get_invoice_file(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    from fastapi import Response
    from models.all import Invoice
    from services.storage_service import get_file_from_storage
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice or not invoice.file_url:
        raise HTTPException(status_code=404, detail="File not found")
        
    file_bytes, content_type = get_file_from_storage(invoice.file_url)
    
    return Response(content=file_bytes, media_type=content_type)

# ── Policy Endpoints ───────────────────────────────────────────────────────────
@router.get("/policies/{organization_id}")
def get_policy(
    organization_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Retrieve the current approval policy for a specific organization."""
    policy = get_or_create_policy(db, organization_id)
    return {
        "organization_id": policy.organization_id,
        "auto_approve_confidence_threshold": policy.auto_approve_confidence_threshold,
        "max_auto_approve_amount": policy.max_auto_approve_amount,
        "high_value_escalation_threshold": policy.high_value_escalation_threshold,
        "require_review_if_duplicate": policy.require_review_if_duplicate,
        "require_review_if_fraud_flag": policy.require_review_if_fraud_flag,
        "ai_auto_review_enabled": policy.ai_auto_review_enabled,
    }

@router.put("/policies/{organization_id}")
def update_policy(
    organization_id: str,
    updates: PolicyUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Update approval policy parameters for a specific organization."""
    policy = get_or_create_policy(db, organization_id)
    changed_fields = []
    for field, value in updates.model_dump(exclude_none=True).items():
        setattr(policy, field, value)
        changed_fields.append(field)
    db.commit()
    db.refresh(policy)
    # Audit log — attach to a synthetic invoice event under the org's first invoice as a marker,
    # or simply log directly via a plain InvoiceEvent if one exists
    log_msg = f"Policy updated by admin {current_admin.id}. Fields changed: {', '.join(changed_fields)}"
    from models.all import Invoice
    sample_invoice = db.query(Invoice).filter(Invoice.organization_id == organization_id).first()
    if sample_invoice:
        log_invoice_event(db, sample_invoice.id, current_admin.id, "POLICY_UPDATED", log_msg)
    return {"message": "Policy updated.", "changed": changed_fields}

# ── Email Poll Endpoint ────────────────────────────────────────────────────────
@router.post("/email/poll")
def manual_email_poll(
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(require_admin)
):
    """Admin-only ad-hoc trigger to sweep the inbox for valid incoming invoices immediately."""
    background_tasks.add_task(fetch_and_process_emails)
    return {"message": "Manual email polling dispatched to background queue."}

# ── Clients List Endpoint ─────────────────────────────────────────────────────
@router.get("/clients")
def admin_list_clients(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Returns all client organizations with their invoice stats."""
    from models.all import Organization, Invoice, InvoiceStatus
    from sqlalchemy import func as sql_func

    orgs = db.query(Organization).all()
    result = []
    for org in orgs:
        users = [u for u in org.users if u.role.value == "client"]
        if not users:
            continue
        invoices = org.invoices
        total = len(invoices)
        approved = sum(1 for i in invoices if i.status.value in ("approved", "auto_approved"))
        rejected = sum(1 for i in invoices if i.status.value == "rejected")
        pending = sum(1 for i in invoices if i.status.value in ("processing", "under_review"))
        # Primary user for display
        primary = users[0]
        result.append({
            "id": org.id,
            "org_name": org.name,
            "email": primary.email,
            "full_name": primary.full_name,
            "avatar_url": primary.avatar_url,
            "total_invoices": total,
            "approved": approved,
            "rejected": rejected,
            "pending": pending,
        })
    return result

@router.delete("/clients/{organization_id}", status_code=204)
def delete_client_organization(
    organization_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """Permanently deletes a client organization, cascading to all users, invoices, and policies."""
    from models.all import Organization
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    db.delete(org)
    db.commit()
    return
