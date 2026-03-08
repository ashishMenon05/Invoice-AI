from typing import Dict, Any

def recompute_math(invoice_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Takes LLM output and recalculates all totals.
    Adds a '_computed' field next to original fields.
    """
    
    # Defaults
    computed_subtotal = 0.0
    line_items = invoice_data.get("line_items", [])
    
    for item in line_items:
        # Avoid type errors if LLM outputs string floats
        qty = float(item.get("quantity", 0.0) or 0.0)
        price = float(item.get("unit_price", 0.0) or 0.0)
        
        computed_total = qty * price
        item["computed_total"] = computed_total
        computed_subtotal += computed_total
        
    invoice_data["computed_subtotal"] = computed_subtotal
    
    tax = float(invoice_data.get("tax", 0.0) or 0.0)
    invoice_data["computed_tax"] = tax
    
    invoice_data["computed_grand_total"] = computed_subtotal + tax
    
    return invoice_data
