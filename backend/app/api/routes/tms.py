"""TMS integration — proxy for embed token exchange."""

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import TeacherOrAdminUser
from app.core.config import settings

router = APIRouter(prefix="/tms", tags=["tms"])


class TMSTokenResponse(BaseModel):
    access_token: str
    embed_url: str


@router.post("/embed-token", response_model=TMSTokenResponse)
async def get_tms_embed_token(current_user: TeacherOrAdminUser) -> TMSTokenResponse:
    """Get a TMS embed token for the current teacher/admin.

    LMS backend calls TMS API with the teacher's document_id + shared API key,
    returns the token + embed URL for the frontend to use in an iframe.
    """
    if not settings.TMS_EMBED_API_KEY:
        raise HTTPException(status_code=503, detail="TMS integratsiyasi sozlanmagan")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.TMS_API_URL}/api/v1/embed/token",
                json={"document_id": current_user.document_id},
                headers={"X-Api-Key": settings.TMS_EMBED_API_KEY},
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="TMS serveriga ulanib bo'lmadi") from exc

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="TMS tokenini olishda xatolik")

    data = resp.json()
    token = data["access_token"]
    embed_url = (
        f"{settings.TMS_ORIGIN}/embed/test-picker"
        f"?token={token}&type=homework"
    )
    return TMSTokenResponse(access_token=token, embed_url=embed_url)
