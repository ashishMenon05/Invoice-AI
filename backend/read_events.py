from dependencies import SessionLocal
from models.all import InvoiceEvent, Invoice

db = SessionLocal()
try:
    invoices = db.query(Invoice).filter(Invoice.status == "UNDER_REVIEW").all()
    print("Reasons for keeping UNDER_REVIEW:")
    for inv in invoices:
        events = db.query(InvoiceEvent).filter(InvoiceEvent.invoice_id == inv.id).order_by(InvoiceEvent.created_at.desc()).limit(1).all()
        for e in events:
            print(f"[{inv.id}] {e.event_type}: {e.message}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
