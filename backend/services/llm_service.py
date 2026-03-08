import json
import logging
from groq import Groq
from core.config import settings

logger = logging.getLogger(__name__)

# Initialize Groq Client
groq_client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

PROMPT_TEMPLATE = """You are a highly advanced Data Extraction AI specializing in complex Invoices and Receipts.
Extract the following information from the provided OCR text and return it STRICTLY as a valid JSON object.
Do NOT include any markdown formatting like ```json or ```. Return pure JSON only.

CRITICAL INSTRUCTIONS FOR ACCURACY & MATH:
1. TABULAR OCR WARNING: OCR engines often scramble tables. Do not blindly assume numbers belong to adjacent text. Ensure description, qty, price, and total make logical sense.
2. 🌍 EUROPEAN DECIMAL FORMATTING: Many invoices use commas (",") instead of periods (".") for decimals (e.g., "5,00" means 5.0, NOT 500). ALWAYS convert comma-decimals to standard periods for JSON float fields. If a quantity appears as "5,00", return `5.0`.
3. 🚨 ZERO QUANTITY HALLUCINATION POLICY 🚨: The "qty" field is almost always a small number (1, 2, 0.5, 10). If you extract a massive integer (like 50000 or 1084), it is likely an Item ID, OR it was a decimal value where the OCR missed the comma (e.g. 500 might actually be 5.00). Use the line math (`total / price = qty`) to deduce the true quantity before falling back to 1.
4. STRICT LINE MATH: For every line item, it MUST mathematically equal: (qty * unit_price) == line_total. If it doesn't match, you extracted the wrong numbers. Fix them.
5. GRAND TOTAL EXTRACTION: Ensure the "grand_total" is the final, bottom-line amount due. If the explicit grand total string is illegible or missing from OCR, you MUST mathematically CALCULATE IT by summing the "line_total" of all extracted line items + tax. DO NOT hallucinate a random number.

Required fields in the JSON response:
- "vendor_name" (string or null)
- "seller_tax_id" (string or null)
- "client_name" (string or null)
- "client_tax_id" (string or null)
- "invoice_number" (string or null)
- "invoice_date" (string or null)
- "subtotal" (float or null)
- "tax" (float or null)
- "grand_total" (float or null): VERY IMPORTANT. Final amount.
- "line_items": Array of objects. Each object MUST have:
  - "description" (string): The human readable product name. Exclude random SKUs from here.
  - "qty" (float): The actual number of items purchased (Double check this is a realistic quantity and not an item ID. Default to 1 if missing).
  - "unit_price" (float): Price per individual unit.
  - "line_total" (float): Total price for that specific line. Must equal (qty * unit_price).

If a field is completely missing from the text, use null (or empty array). Do not guess names or IDs if they are not printed on the document.


Invoice Text:
---------------
{text}
---------------
"""

def extract_invoice_data_with_llm(raw_text: str) -> dict:
    """
    Sends raw extracted OCR text to Groq LLM to rigidly structure it into JSON.
    Strips markdown formatting and parses the dictionary.
    """
    if not raw_text.strip():
        return {}

    if not groq_client:
        logger.warning("Groq API Key not configured. Skipping LLM execution. Returning mock JSON with OCR preview.")
        return {
            "vendor_name": "OCR Fallback Mode",
            "invoice_number": "N/A",
            "invoice_date": "N/A",
            "subtotal": 0.0,
            "tax": 0.0,
            "grand_total": 0.0,
            "line_items": [{"description": f"RAW OCR: {raw_text[:500]}...", "qty": 1, "unit_price": 0, "line_total": 0}]
        }
        
    prompt = PROMPT_TEMPLATE.format(text=raw_text)
    
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile", # Highly capable 70B model for complex JSON
            messages=[
                {"role": "system", "content": "You are a JSON-only API. Respond strictly in valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0, # Maximum determinism
            max_tokens=1024,
            response_format={"type": "json_object"}
        )
        
        response_text = completion.choices[0].message.content.strip()
        
        # Aggressive JSON cleaning in case of rogue markdown
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        parsed_json = json.loads(response_text.strip())
        
        # Failsafe: Guarantee total calculation to prevent $0 totals and math hallucinations
        if isinstance(parsed_json, dict) and 'line_items' in parsed_json and isinstance(parsed_json['line_items'], list):
            calculated_total = sum(float(item.get('line_total') or 0.0) for item in parsed_json['line_items'] if isinstance(item, dict))
            
            if not parsed_json.get('grand_total') and calculated_total > 0:
                parsed_json['grand_total'] = round(calculated_total, 2)
                
            if not parsed_json.get('subtotal') and parsed_json.get('grand_total'):
                parsed_json['subtotal'] = parsed_json['grand_total']

        return parsed_json

        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response into JSON: {e}")
        return {"error": "JSON parse error from LLM", "raw_response": response_text if 'response_text' in locals() else 'None'}
    except Exception as e:
        logger.error(f"Groq LLM Exception: {e}")
        return {}
