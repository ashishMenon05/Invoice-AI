"""
Policy Engine — Evaluates per-organization approval rules after AI processing.
Replaces all hardcoded 0.95/10000 thresholds with tenant-configurable values.
"""
from sqlalchemy.orm import Session
from models.all import OrganizationPolicy, InvoiceStatus
import logging

logger = logging.getLogger(__name__)

_DEFAULTS = {
    "auto_approve_confidence_threshold": 0.95,
    "max_auto_approve_amount": 50000.0,
    "high_value_escalation_threshold": 100000.0,
    "require_review_if_duplicate": True,
    "require_review_if_fraud_flag": True,
}


def get_or_create_policy(db: Session, org_id: str) -> OrganizationPolicy:
    """Returns the org's policy, auto-creating one with defaults if absent."""
    policy = db.query(OrganizationPolicy).filter(
        OrganizationPolicy.organization_id == org_id
    ).first()
    if not policy:
        policy = OrganizationPolicy(organization_id=org_id, **_DEFAULTS)
        db.add(policy)
        db.commit()
        db.refresh(policy)
        logger.info(f"Auto-created default policy for org {org_id}")
    return policy


def evaluate_policy(
    policy: OrganizationPolicy,
    confidence_score: float,
    total_amount: float,
    is_duplicate: bool,
    is_fraud: bool,
) -> tuple[InvoiceStatus, list[str], bool]:
    """
    Returns: (final_status, reasons_list, escalation_flag)

    Decision matrix:
      - Any blocking condition          → UNDER_REVIEW
      - All conditions clear            → AUTO_APPROVED
      - amount > high_value_threshold   → escalation_flag = True (still reviewed)
    """
    reasons: list[str] = []
    escalate = False

    if confidence_score < policy.auto_approve_confidence_threshold:
        reasons.append(
            f"Confidence {round(confidence_score * 100, 1)}% below policy threshold "
            f"({round(policy.auto_approve_confidence_threshold * 100, 1)}%)"
        )

    if total_amount > policy.max_auto_approve_amount:
        reasons.append(
            f"Amount ${total_amount:,.2f} exceeds auto-approve limit "
            f"(${policy.max_auto_approve_amount:,.2f})"
        )

    if is_duplicate and policy.require_review_if_duplicate:
        reasons.append("Duplicate detection policy requires manual review")

    if is_fraud and policy.require_review_if_fraud_flag:
        reasons.append("Fraud signal policy requires manual review")

    if total_amount > policy.high_value_escalation_threshold:
        escalate = True
        reasons.append(
            f"High-value escalation: amount ${total_amount:,.2f} exceeds "
            f"escalation threshold (${policy.high_value_escalation_threshold:,.2f})"
        )

    status = InvoiceStatus.UNDER_REVIEW if reasons else InvoiceStatus.AUTO_APPROVED
    return status, reasons, escalate
