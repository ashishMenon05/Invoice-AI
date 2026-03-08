"""
Analytics Service — All aggregations are computed server-side using SQLAlchemy
GROUP BY queries to prevent N+1 patterns and keep dashboard loads fast.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, case, cast, Date
from datetime import datetime, timedelta, timezone
from models.all import Invoice, InvoiceStatus


def get_analytics(db: Session) -> dict:
    """
    Single-pass aggregation returning all dashboard metrics.
    Designed to minimise DB round-trips.
    """

    # ── 1. Core aggregate (single query) ──────────────────────────────────────
    totals = db.query(
        func.count(Invoice.id).label("total"),
        func.sum(case((Invoice.status == InvoiceStatus.AUTO_APPROVED, 1), else_=0)).label("auto_approved"),
        func.sum(case((Invoice.status == InvoiceStatus.APPROVED, 1), else_=0)).label("approved"),
        func.sum(case((Invoice.status == InvoiceStatus.UNDER_REVIEW, 1), else_=0)).label("under_review"),
        func.sum(case((Invoice.status == InvoiceStatus.REJECTED, 1), else_=0)).label("rejected"),
        func.sum(case((Invoice.duplicate_flag == True, 1), else_=0)).label("duplicates"),
        func.sum(case((Invoice.fraud_flag == True, 1), else_=0)).label("fraud_flags"),
        func.avg(Invoice.confidence_score).label("avg_confidence"),
        func.avg(Invoice.processing_time_seconds).label("avg_processing_time"),
        func.sum(case((Invoice.status.in_([InvoiceStatus.APPROVED, InvoiceStatus.AUTO_APPROVED]), Invoice.total_amount), else_=0)).label("total_volume_usd")
    ).one()

    total = totals.total or 0
    total_finalized = (totals.auto_approved or 0) + (totals.approved or 0)
    approval_rate = round((total_finalized / total) * 100, 1) if total > 0 else 0.0

    summary = {
        "total_invoices": total,
        "total_auto_approved": totals.auto_approved or 0,
        "total_approved": totals.approved or 0,
        "total_under_review": totals.under_review or 0,
        "total_rejected": totals.rejected or 0,
        "total_duplicates": totals.duplicates or 0,
        "total_fraud_flags": totals.fraud_flags or 0,
        "average_confidence_score": round(totals.avg_confidence or 0, 4) if totals.avg_confidence else 0,
        "average_processing_time_seconds": round(totals.avg_processing_time or 0, 2) if totals.avg_processing_time else 0,
        "auto_approval_rate_percentage": approval_rate,
        "total_volume_usd": round(totals.total_volume_usd or 0, 2)
    }

    # ── 2. Today count ─────────────────────────────────────────────────────────
    today_start = datetime.now(tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    summary["invoices_processed_today"] = db.query(func.count(Invoice.id)).filter(
        Invoice.created_at >= today_start
    ).scalar() or 0

    # ── 3. Daily counts — last 7 days (GROUP BY date) ─────────────────────────
    seven_days_ago = datetime.now(tz=timezone.utc) - timedelta(days=7)
    daily_rows = db.query(
        cast(Invoice.created_at, Date).label("day"),
        func.count(Invoice.id).label("count"),
        func.sum(case((Invoice.fraud_flag == True, 1), else_=0)).label("fraud"),
        func.sum(Invoice.total_amount).label("daily_volume_usd"),
        func.avg(Invoice.processing_time_seconds).label("daily_avg_processing_time")
    ).filter(
        Invoice.created_at >= seven_days_ago
    ).group_by(
        cast(Invoice.created_at, Date)
    ).order_by(
        cast(Invoice.created_at, Date)
    ).all()

    daily_counts = [
        {
            "date": str(row.day), 
            "count": row.count, 
            "fraud": int(row.fraud or 0),
            "volume_usd": round(row.daily_volume_usd or 0, 2),
            "avg_processing_time": round(row.daily_avg_processing_time or 0, 2)
        }
        for row in daily_rows
    ]

    # Back-fill missing days with zero so the chart always shows 7 bars
    existing_dates = {d["date"] for d in daily_counts}
    for i in range(7):
        d = (datetime.now(tz=timezone.utc) - timedelta(days=6 - i)).date()
        ds = str(d)
        if ds not in existing_dates:
            daily_counts.append({
                "date": ds, 
                "count": 0, 
                "fraud": 0,
                "volume_usd": 0,
                "avg_processing_time": 0
            })
    daily_counts.sort(key=lambda x: x["date"])

    summary["invoices_last_7_days"] = sum(d["count"] for d in daily_counts)

    # ── 4. Approval distribution for pie chart ─────────────────────────────────
    approval_distribution = [
        {"name": "Auto Approved", "value": totals.auto_approved or 0},
        {"name": "Approved",      "value": totals.approved or 0},
        {"name": "Under Review",  "value": totals.under_review or 0},
        {"name": "Rejected",      "value": totals.rejected or 0},
    ]

    # ── 5. Top Vendors by Volume ───────────────────────────────────────────────
    top_vendors_rows = db.query(
        Invoice.vendor_name,
        func.count(Invoice.id).label("count"),
        func.sum(Invoice.total_amount).label("volume_usd")
    ).filter(
        Invoice.vendor_name.isnot(None),
        Invoice.status.in_([InvoiceStatus.APPROVED, InvoiceStatus.AUTO_APPROVED])
    ).group_by(
        Invoice.vendor_name
    ).order_by(
        func.sum(Invoice.total_amount).desc()
    ).limit(5).all()

    top_vendors = [
        {
            "name": row.vendor_name,
            "count": row.count,
            "volume_usd": round(row.volume_usd or 0, 2)
        }
        for row in top_vendors_rows
    ]

    return {
        "summary": summary,
        "daily_counts": daily_counts,
        "fraud_trend": [{"date": d["date"], "fraud": d["fraud"]} for d in daily_counts],
        "processing_time_trend": [{"date": d["date"], "time": d["avg_processing_time"]} for d in daily_counts],
        "volume_trend": [{"date": d["date"], "volume_usd": d["volume_usd"]} for d in daily_counts],
        "approval_distribution": approval_distribution,
        "top_vendors": top_vendors
    }
