"""Public app config — shared constants surfaced to the frontend.

Single source of truth for values the client needs to mirror (upload limits,
plan field count). Avoids hard-coded duplicates that drift when one side changes.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.routes.lessons._helpers import PLAN_TOTAL_FIELDS
from app.core.config import settings

router = APIRouter(prefix="/config", tags=["config"])


class AppConfigRead(BaseModel):
    max_file_size_mb: int
    plan_total_fields: int


@router.get("/", response_model=AppConfigRead)
async def get_app_config() -> AppConfigRead:
    """Static config values mirrored by the frontend. Safe to cache aggressively."""
    return AppConfigRead(
        max_file_size_mb=settings.MAX_FILE_SIZE_MB,
        plan_total_fields=PLAN_TOTAL_FIELDS,
    )
