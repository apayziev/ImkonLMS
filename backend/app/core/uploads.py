"""File upload utilities."""

import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.exceptions import BadRequestException

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

# Allowed extensions for lesson materials (documents, images, archives)
ALLOWED_MATERIAL_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".rtf", ".odt", ".ods", ".odp",
    ".jpg", ".jpeg", ".png", ".webp", ".gif",
    ".mp3", ".mp4", ".wav", ".ogg",
    ".zip", ".rar", ".7z",
}


async def validate_and_save_file(
    file: UploadFile,
    upload_dir: Path,
    *,
    filename_prefix: str = "",
) -> tuple[str, str, int]:
    """Validate and save any uploaded file.

    Returns (relative_url, original_filename, file_size_bytes).
    """
    original_name = file.filename or "file"
    ext = Path(original_name).suffix.lower()

    if ext not in ALLOWED_MATERIAL_EXTENSIONS:
        raise BadRequestException(
            f"Bu fayl turi qabul qilinmaydi. Ruxsat etilgan: "
            f"{', '.join(sorted(ALLOWED_MATERIAL_EXTENSIONS))}"
        )

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise BadRequestException("Fayl hajmi 20MB dan oshmasligi kerak")

    filename = f"{filename_prefix}{uuid.uuid4().hex[:12]}{ext}"

    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / filename
    file_path.write_bytes(contents)

    return f"/uploads/{upload_dir.name}/{filename}", original_name, len(contents)
