"""File upload utilities."""

import uuid
from pathlib import Path

import filetype
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import BadRequestException

MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024

UPLOADS_DIR = Path("uploads")
MATERIALS_UPLOAD_DIR = UPLOADS_DIR / "materials"


def resolve_stored_path(upload_dir: Path, file_url: str) -> Path:
    """Resolve an absolute disk path for a stored file URL.

    Uses Path.name to strip any directory components (defense against traversal),
    then joins with the (resolved) upload_dir. Returns absolute path.
    """
    base = upload_dir.resolve()
    return base / Path(file_url).name

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


_CHUNK_SIZE = 1024 * 1024  # 1MB streaming chunks

_OVERSIZE_MSG = "Fayl hajmi {mb}MB dan oshmasligi kerak"
_TYPE_MISMATCH_MSG = "Fayl tarkibi va kengaytmasi mos kelmaydi. Iltimos, to'g'ri fayl yuklang."


def _validate_magic(header: bytes, ext: str) -> None:
    expected = _EXT_MIME_MAP.get(ext)
    if not expected:
        return
    kind = filetype.guess(header)
    if (kind.mime if kind else None) not in expected:
        raise BadRequestException(_TYPE_MISMATCH_MSG)


async def validate_and_save_file(
    file: UploadFile,
    upload_dir: Path,
    *,
    filename_prefix: str = "",
) -> tuple[str, str, int]:
    """Validate and stream-save an uploaded file.

    Streams to disk in chunks (no full file in RAM). Validates magic bytes
    on the first chunk and aborts early if the type doesn't match.

    Returns (relative_url, original_filename, file_size_bytes).
    """
    original_name = file.filename or "file"
    ext = Path(original_name).suffix.lower()

    if ext not in ALLOWED_MATERIAL_EXTENSIONS:
        raise BadRequestException(
            f"Bu fayl turi qabul qilinmaydi. Ruxsat etilgan: "
            f"{', '.join(sorted(ALLOWED_MATERIAL_EXTENSIONS))}"
        )

    # Pre-check via Content-Length when available (cheap; rejects oversize uploads early).
    if file.size is not None and file.size > MAX_FILE_SIZE:
        raise BadRequestException(_OVERSIZE_MSG.format(mb=settings.MAX_FILE_SIZE_MB))

    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{filename_prefix}{uuid.uuid4().hex[:12]}{ext}"
    file_path = upload_dir / filename

    written = 0
    magic_checked = False
    try:
        with file_path.open("wb") as out:
            while chunk := await file.read(_CHUNK_SIZE):
                if not magic_checked:
                    _validate_magic(chunk[:512], ext)
                    magic_checked = True
                written += len(chunk)
                if written > MAX_FILE_SIZE:
                    raise BadRequestException(
                        _OVERSIZE_MSG.format(mb=settings.MAX_FILE_SIZE_MB)
                    )
                out.write(chunk)
    except Exception:
        if file_path.exists():
            file_path.unlink()
        raise

    return f"/uploads/{upload_dir.name}/{filename}", original_name, written
