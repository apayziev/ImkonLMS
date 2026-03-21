"""Logout route."""

from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response

from app.core.security import oauth2_scheme

router = APIRouter(tags=["login"])


@router.post("/logout")
async def logout(
    response: Response,
    _token: Annotated[str, Depends(oauth2_scheme)],
    refresh_token: Annotated[str | None, Cookie(alias="refresh_token")] = None,
) -> dict[str, str]:
    """Tizimdan chiqish."""
    response.delete_cookie(key="refresh_token")
    return {"message": "Muvaffaqiyatli chiqildi"}
