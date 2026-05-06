"""Login routes for IMKON LMS."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes._shared import resolve_parent_name
from app.core.config import settings
from app.core.db import async_get_db
from app.core.exceptions import UnauthorizedException
from app.core.rate_limit import limiter
from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_token,
)
from app.crud import refresh_tokens
from app.crud.refresh_tokens import RefreshRotationError
from app.crud.users import crud_users
from app.models.grade import Grade
from app.models.parent_auth import ParentAuth
from app.models.user import User, UserRole
from app.schemas.parent import (
    ParentChildRead,
    ParentLoginRequest,
    ParentMeRead,
    ParentTokenResponse,
)
from app.schemas.users import LoginRequest, StudentLoginRequest, TokenResponse, UserRead

router = APIRouter(prefix="/login", tags=["login"])


def _set_auth_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=any(o.startswith("https://") for o in settings.CORS_ORIGINS),
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        domain=settings.COOKIE_DOMAIN or None,
    )


async def _issue_session(
    db: AsyncSession,
    response: Response,
    *,
    subject: str,
    role: str | None,
) -> str:
    """Persist a fresh refresh-token family, set the cookie, return access token."""
    issued = await refresh_tokens.issue(db, subject=subject, role=role)
    refresh_payload: dict = {
        "sub": subject,
        "jti": str(issued.jti),
        "fid": str(issued.family_id),
    }
    if role:
        refresh_payload["role"] = role

    access_payload: dict = {"sub": subject}
    if role:
        access_payload["role"] = role

    refresh = create_refresh_token(data=refresh_payload)
    _set_auth_cookie(response, refresh)
    return create_access_token(data=access_payload)


async def _create_token_response(
    db: AsyncSession,
    response: Response,
    user: User,
) -> TokenResponse:
    access = await _issue_session(
        db, response, subject=user.document_id, role=user.role
    )
    return TokenResponse(
        access_token=access,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.post("/", response_model=TokenResponse)
@limiter.limit("5/minute;30/hour")
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TokenResponse:
    """Tizimga kirish (document_id va parol bilan)."""
    user = await crud_users.authenticate(
        db=db, username=login_data.document_id, password=login_data.password
    )
    if not user:
        raise UnauthorizedException("Noto'g'ri hujjat raqami yoki parol.")
    if not user.is_active:
        raise UnauthorizedException("Foydalanuvchi faol emas.")

    return await _create_token_response(db, response, user)


@router.post("/access-token")
@limiter.limit("5/minute;30/hour")
async def login_for_access_token(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """OAuth2 compatible token login (username = document_id)."""
    user = await crud_users.authenticate(
        db=db, username=form_data.username, password=form_data.password
    )
    if not user:
        raise UnauthorizedException("Noto'g'ri hujjat raqami yoki parol.")
    if not user.is_active:
        raise UnauthorizedException("Foydalanuvchi faol emas.")

    access = await _issue_session(
        db, response, subject=user.document_id, role=user.role
    )
    return {"access_token": access, "token_type": "bearer"}


@router.post("/refresh")
@limiter.limit("30/minute")
async def refresh_access_token(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """Rotate the refresh token (single-use) and mint a new access token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise UnauthorizedException("Refresh token topilmadi.")

    payload = verify_token(refresh_token, TokenType.REFRESH)
    if not payload or not payload.get("jti"):
        raise UnauthorizedException("Yaroqsiz refresh token.")

    try:
        jti = uuid.UUID(payload["jti"])
    except (ValueError, TypeError) as e:
        raise UnauthorizedException("Yaroqsiz refresh token.") from e

    try:
        rotated = await refresh_tokens.rotate(db, jti=jti)
    except RefreshRotationError as e:
        response.delete_cookie(
            key="refresh_token", domain=settings.COOKIE_DOMAIN or None
        )
        raise UnauthorizedException("Yaroqsiz refresh token.") from e

    refresh_payload: dict = {
        "sub": rotated.subject,
        "jti": str(rotated.new_jti),
        "fid": str(rotated.family_id),
    }
    access_payload: dict = {"sub": rotated.subject}
    if rotated.role:
        refresh_payload["role"] = rotated.role
        access_payload["role"] = rotated.role

    _set_auth_cookie(response, create_refresh_token(data=refresh_payload))
    return {
        "access_token": create_access_token(data=access_payload),
        "token_type": "bearer",
    }


@router.post("/student", response_model=TokenResponse)
@limiter.limit("5/minute;30/hour")
async def login_student(
    request: Request,
    response: Response,
    login_data: StudentLoginRequest,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TokenResponse:
    """O'quvchi uchun tizimga kirish (PAROLSIZ)."""
    user = await crud_users.authenticate_student(
        db=db, document_id=login_data.document_id
    )
    if not user:
        raise UnauthorizedException("O'quvchi topilmadi yoki siz o'quvchi emassiz.")
    if not user.is_active:
        raise UnauthorizedException("Foydalanuvchi faol emas.")
    if user.is_frozen:
        raise UnauthorizedException("Hisob muzlatilgan.")

    return await _create_token_response(db, response, user)


@router.post("/parent", response_model=ParentTokenResponse)
@limiter.limit("5/minute;30/hour")
async def login_parent(
    request: Request,
    response: Response,
    login_data: ParentLoginRequest,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> ParentTokenResponse:
    """Ota-ona uchun tizimga kirish (telefon + parol)."""
    result = await db.execute(
        select(ParentAuth).where(ParentAuth.phone == login_data.phone)
    )
    parent = result.scalar_one_or_none()

    if not parent or not verify_password(login_data.password, parent.hashed_password):
        raise UnauthorizedException("Noto'g'ri telefon raqami yoki parol.")
    if not parent.is_active:
        raise UnauthorizedException("Hisob faol emas.")

    # Find children by phone match
    children_result = await db.execute(
        select(User).where(
            User.role == UserRole.STUDENT.value,
            User.is_deleted == False,  # noqa: E712
            (User.father_phone == parent.phone) | (User.mother_phone == parent.phone),
        )
    )
    children = list(children_result.scalars().all())
    name = resolve_parent_name(parent.phone, children)

    access_token = await _issue_session(
        db, response, subject=parent.phone, role="parent"
    )

    # Batch load grades for all children (no N+1)
    grade_ids = {c.grade_id for c in children if c.grade_id}
    grade_map: dict[int, str] = {}
    if grade_ids:
        grade_result = await db.execute(select(Grade).where(Grade.id.in_(grade_ids)))
        grade_map = {g.id: g.display_name for g in grade_result.scalars().all()}

    child_reads = [
        ParentChildRead(
            id=c.id,
            first_name=c.first_name,
            last_name=c.last_name,
            full_name=c.full_name,
            photo_url=c.photo_url,
            grade_id=c.grade_id,
            grade_display=grade_map.get(c.grade_id),
            is_active=c.is_active,
            is_frozen=c.is_frozen,
        )
        for c in children
    ]

    return ParentTokenResponse(
        access_token=access_token,
        parent=ParentMeRead(phone=parent.phone, name=name, children=child_reads),
    )
