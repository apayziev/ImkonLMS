"""Logging utilities — PII masking for safe log output."""


def mask_phone(phone: str | None) -> str:
    """Mask phone number for logs: '+998901234567' -> '+998***4567'."""
    if not phone:
        return ""
    cleaned = phone.strip()
    if len(cleaned) <= 7:
        return "***"
    return f"{cleaned[:4]}***{cleaned[-4:]}"


def mask_document_id(doc_id: str | None) -> str:
    """Mask document ID for logs: 'AB1234567' -> 'AB***567'."""
    if not doc_id:
        return ""
    cleaned = doc_id.strip()
    if len(cleaned) <= 5:
        return "***"
    return f"{cleaned[:2]}***{cleaned[-3:]}"
