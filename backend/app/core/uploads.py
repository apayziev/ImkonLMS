"""File upload utilities."""

import uuid
from pathlib import Path

import filetype
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

# Extension → expected MIME types (magic bytes).
# Text-based formats (.txt, .rtf, .csv) have no reliable magic bytes — skip them.
_EXT_MIME_MAP: dict[str, set[str]] = {
    ".pdf": {"application/pdf"},
    ".doc": {"application/msword", "application/x-cfb"},
    ".docx": {"application/zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    ".xls": {"application/msword", "application/x-cfb", "application/vnd.ms-excel"},
    ".xlsx": {"application/zip", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    ".ppt": {"application/msword", "application/x-cfb", "application/vnd.ms-powerpoint"},
    ".pptx": {"application/zip", "application/vnd.openxmlformats-officedocument.presentationml.presentation"},
    ".odt": {"application/zip"},
    ".ods": {"application/zip"},
    ".odp": {"application/zip"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".png": {"image/png"},
    ".webp": {"image/webp"},
    ".gif": {"image/gif"},
    ".mp3": {"audio/mpeg"},
    ".mp4": {"video/mp4"},
    ".wav": {"audio/x-wav", "audio/wav"},
    ".ogg": {"audio/ogg", "video/ogg", "application/ogg"},
    ".zip": {"application/zip"},
    ".rar": {"application/x-rar-compressed", "application/vnd.rar"},
    ".7z": {"application/x-7z-compressed"},
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

    # Magic bytes validation — ensure file content matches the declared extension
    expected_mimes = _EXT_MIME_MAP.get(ext)
    if expected_mimes:
        kind = filetype.guess(contents)
        detected_mime = kind.mime if kind else None
        if detected_mime not in expected_mimes:
            raise BadRequestException(
                "Fayl tarkibi va kengaytmasi mos kelmaydi. "
                "Iltimos, to'g'ri fayl yuklang."
            )

    filename = f"{filename_prefix}{uuid.uuid4().hex[:12]}{ext}"

    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / filename
    file_path.write_bytes(contents)

    return f"/uploads/{upload_dir.name}/{filename}", original_name, len(contents)
