import os
import logging
import json
from groq import Groq
from typing import Tuple
from models.all import InvoiceStatus
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

def perform_ai_auto_review(db: Session, invoice, raw_text: str, user_id: str) -> Tuple[InvoiceStatus, str, bool]:
    """
    Acts as a secondary autonomous AI agent to evaluate 'UNDER_REVIEW' invoices.
    It returns a tuple of (NewStatus, ReasonMessage, NeedsAdminAlert)
    """
    try:
        # Fast-track Auto-Pilot approval for reasonable confidence scores
        if invoice.confidence_score is not None and invoice.confidence_score >= 0.55:
            if not invoice.duplicate_flag and not invoice.fraud_flag:
                return InvoiceStatus.APPROVED, f"Auto-Pilot Fast-Track: Confidence Score of {invoice.confidence_score*100:.1f}% met the >= 55% threshold.", False

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return InvoiceStatus.ADMIN_PASS_NEEDED, "AI Auto-Review skipped: GROQ_API_KEY missing.", False

        client = Groq(api_key=api_key)
        
        # Prepare the data for the LLM
        extracted_data_str = json.dumps(invoice.extracted_json or {}, indent=2)
        system_prompt = f"""You are an expert autonomous Accounting Auditor AI. 
You are given the raw OCR text of an invoice, and the structured JSON data extracted from it. 
Your job is to determine if the invoice is legitimate, fraudulent, or contains critical errors.

Review the raw OCR text and the extracted JSON data below.
Compare them carefully. Are the totals correct? Is the vendor legitimate? Is there evidence of tampering or hallucination?

Return ONLY a valid JSON object with the following schema:
{{
  "decision": "APPROVED" | "REJECTED" | "UNCERTAIN",
  "reason": "A detailed explanation of why you made this decision."
}}

If you are absolutely certain the invoice is legitimate, return APPROVED.
If you are absolutely certain it is fraudulent, a duplicate, or has critical data mismatches, return REJECTED.
If you are unsure or the data is a confusing mess, return UNCERTAIN.
Do NOT output anything other than JSON.
"""
        
        user_prompt = f"### RAW OCR TEXT:\n{raw_text}\n\n### EXTRACTED JSON STRUCTURE:\n{extracted_data_str}"

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,
            max_tokens=600,
            response_format={"type": "json_object"}
        )

        result_text = response.choices[0].message.content
        result_json = json.loads(result_text)
        
        decision = result_json.get("decision", "UNCERTAIN")
        reason = result_json.get("reason", "No reason provided.")

        if decision == "APPROVED":
            return InvoiceStatus.APPROVED, f"Autonomous AI Auditor Approved: {reason}", False
        elif decision == "REJECTED":
            return InvoiceStatus.REJECTED, f"Autonomous AI Auditor Rejected: {reason}", True
        else:
            return InvoiceStatus.ADMIN_PASS_NEEDED, f"Autonomous AI Auditor Uncertain: {reason}. Manual review required.", False

    except Exception as e:
        logger.error(f"AI Auto-Review failed: {str(e)}")
        # Gracefully yield to human review if the AI fails
        return InvoiceStatus.ADMIN_PASS_NEEDED, "Autonomous AI Auditor encountered an error and gracefully yielded to human review.", False
