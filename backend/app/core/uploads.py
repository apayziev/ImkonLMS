"""File upload utilities."""

import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.exceptions import BadRequestException

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


async def validate_and_save_image(
    file: UploadFile,
    upload_dir: Path,
    *,
    filename_prefix: str = "",
) -> str:
    """Validate and save an uploaded image file. Returns the relative path."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise BadRequestException("Faqat JPG, PNG yoki WEBP formatdagi rasmlar qabul qilinadi")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise BadRequestException("Rasm hajmi 5MB dan oshmasligi kerak")

    ext = Path(file.filename or "photo.jpg").suffix.lower() or ".jpg"
    filename = f"{filename_prefix}{uuid.uuid4().hex}{ext}"

    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / filename
    file_path.write_bytes(contents)

    return f"/{file_path}"
