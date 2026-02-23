import re

def clean_json_response(raw_text: str) -> str:
    """Removes markdown backticks and extracts just the JSON object/array."""
    # Remove markdown formatting
    cleaned = re.sub(r'```json\s*', '', raw_text)
    cleaned = re.sub(r'```\s*', '', cleaned)
    
    # Strip leading/trailing whitespace
    cleaned = cleaned.strip()
    
    # Simple heuristic to extract JSON if there's text before/after
    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    
    if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
        return cleaned[start_idx:end_idx+1]
        
    return cleaned
