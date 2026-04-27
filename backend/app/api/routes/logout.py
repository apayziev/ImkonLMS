"""Logout route."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import async_get_db
from app.core.security import TokenType, oauth2_scheme, verify_token
from app.crud import refresh_tokens

router = APIRouter(tags=["login"])


@router.post("/logout")
async def logout(
    response: Response,
    _token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    refresh_token: Annotated[str | None, Cookie(alias="refresh_token")] = None,
) -> dict[str, str]:
    """Revoke the refresh-token family and clear the cookie."""
    if refresh_token:
        payload = verify_token(refresh_token, TokenType.REFRESH)
        fid = payload.get("fid") if payload else None
        if fid:
            try:
                await refresh_tokens.revoke_family(db, uuid.UUID(fid))
            except (ValueError, TypeError):
                pass

    response.delete_cookie(key="refresh_token", domain=settings.COOKIE_DOMAIN or None)
    return {"message": "Muvaffaqiyatli chiqildi"}
