def validate_and_score(extracted_json: dict):
    """
    Validates the structure and math of an LLM-extracted invoice JSON.
    Computes a confidence score based on:
      - Schema valid/Required fields present: 30%
      - Math integrity (line items): 30%
      - Math integrity (totals): 40%
    
    Returns a tuple: (confidence_score [0.0 - 1.0], validation_flags)
    """
    score = 0.0
    flags = []

    if not extracted_json or "error" in extracted_json:
        return 0.0, ["Missing or invalid JSON structure"]

    # 1. Required Fields Check (30% weight)
    required_fields = ["vendor_name", "invoice_number", "invoice_date", "grand_total"]
    present_fields = [f for f in required_fields if extracted_json.get(f) is not None]
    
    if len(present_fields) == len(required_fields):
        score += 0.30
    else:
        score += 0.30 * (len(present_fields) / len(required_fields))
        flags.append(f"Missing essential fields: {set(required_fields) - set(present_fields)}")

    # 2. Line Items Math (30% weight)
    line_items_valid = True
    line_items = extracted_json.get("line_items", [])
    
    if not line_items:
        flags.append("No line items found")
        # If no line items, we can't grant the 30%
    else:
        computed_subtotal = 0.0
        for item in line_items:
            try:
                qty = float(item.get("qty") or 1.0)
                unit_price = float(item.get("unit_price") or 0.0)
                expected_line_total = round(qty * unit_price, 2)
                provided_line_total = float(item.get("line_total") or 0.0)
                
                computed_subtotal += provided_line_total
                
                if abs(expected_line_total - provided_line_total) > 0.02:
                    line_items_valid = False
            except (ValueError, TypeError):
                line_items_valid = False
                
        if line_items_valid:
            score += 0.30
        else:
            flags.append("Line item math (qty * price) mismatch")

    # 3. Totals Math (40% weight)
    try:
        subtotal = float(extracted_json.get("subtotal") or (computed_subtotal if line_items else 0.0))
        tax = float(extracted_json.get("tax") or 0.0)
        grand_total = float(extracted_json.get("grand_total") or 0.0)
        
        expected_grand_total = round(subtotal + tax, 2)
        
        if abs(expected_grand_total - grand_total) <= 0.02:
            score += 0.40
        else:
            flags.append(f"Totals mismatch: subtotal ({subtotal}) + tax ({tax}) != grand_total ({grand_total})")
    except (ValueError, TypeError):
        flags.append("Invalid numeric formatting for totals")

    return score, flags
