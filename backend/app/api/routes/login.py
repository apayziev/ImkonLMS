"""Login routes for IMKON LMS."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import async_get_db
from app.core.exceptions import UnauthorizedException
from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_token,
)
from app.crud.users import crud_users
from app.models.parent_auth import ParentAuth
from app.models.user import User, UserRole
from app.schemas.parent import ParentChildRead, ParentLoginRequest, ParentMeRead, ParentTokenResponse
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
    )


def _create_token_response(response: Response, user: User) -> TokenResponse:
    access_token = create_access_token(data={"sub": user.document_id})
    refresh_token = create_refresh_token(data={"sub": user.document_id})
    _set_auth_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token, token_type="bearer", user=UserRead.model_validate(user))


@router.post("/", response_model=TokenResponse)
async def login(
    response: Response,
    login_data: LoginRequest,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TokenResponse:
    """Tizimga kirish (document_id va parol bilan)."""
    user = await crud_users.authenticate(db=db, username=login_data.document_id, password=login_data.password)
    if not user:
        raise UnauthorizedException("Noto'g'ri hujjat raqami yoki parol.")
    if not user.is_active:
        raise UnauthorizedException("Foydalanuvchi faol emas.")

    return _create_token_response(response, user)


@router.post("/access-token")
async def login_for_access_token(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """OAuth2 compatible token login (username = document_id)."""
    user = await crud_users.authenticate(db=db, username=form_data.username, password=form_data.password)
    if not user:
        raise UnauthorizedException("Noto'g'ri hujjat raqami yoki parol.")
    if not user.is_active:
        raise UnauthorizedException("Foydalanuvchi faol emas.")

    access_token = create_access_token(data={"sub": user.document_id})
    refresh_token = create_refresh_token(data={"sub": user.document_id})
    _set_auth_cookie(response, refresh_token)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh")
async def refresh_access_token(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """Token yangilash."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise UnauthorizedException("Refresh token topilmadi.")

    user_data = verify_token(refresh_token, TokenType.REFRESH)
    if not user_data:
        raise UnauthorizedException("Yaroqsiz refresh token.")

    # Preserve role in refreshed token
    token_payload: dict = {"sub": user_data["document_id"]}
    if user_data.get("role"):
        token_payload["role"] = user_data["role"]
    return {"access_token": create_access_token(data=token_payload), "token_type": "bearer"}


@router.post("/student", response_model=TokenResponse)
async def login_student(
    response: Response,
    login_data: StudentLoginRequest,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> TokenResponse:
    """O'quvchi uchun tizimga kirish (PAROLSIZ)."""
    user = await crud_users.authenticate_student(db=db, document_id=login_data.document_id)
    if not user:
        raise UnauthorizedException("O'quvchi topilmadi yoki siz o'quvchi emassiz.")
    if not user.is_active:
        raise UnauthorizedException("Foydalanuvchi faol emas.")

    return _create_token_response(response, user)


@router.post("/parent", response_model=ParentTokenResponse)
async def login_parent(
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
    children = children_result.scalars().all()

    # Determine parent name from first child's data
    name = parent.phone
    for child in children:
        if child.father_phone == parent.phone and child.father_first_name:
            name = f"{child.father_last_name or ''} {child.father_first_name}".strip()
            break
        if child.mother_phone == parent.phone and child.mother_first_name:
            name = f"{child.mother_last_name or ''} {child.mother_first_name}".strip()
            break

    access_token = create_access_token(data={"sub": parent.phone, "role": "parent"})
    refresh_token = create_refresh_token(data={"sub": parent.phone, "role": "parent"})
    _set_auth_cookie(response, refresh_token)

    # Batch load grades for all children (no N+1)
    grade_ids = {c.grade_id for c in children if c.grade_id}
    grade_map: dict[int, str] = {}
    if grade_ids:
        from app.models.grade import Grade
        grade_result = await db.execute(select(Grade).where(Grade.id.in_(grade_ids)))
        grade_map = {g.id: g.display_name for g in grade_result.scalars().all()}

    child_reads = [
        ParentChildRead(
            id=c.id, first_name=c.first_name, last_name=c.last_name,
            full_name=c.full_name, photo_url=c.photo_url,
            grade_id=c.grade_id, grade_display=grade_map.get(c.grade_id),
            is_active=c.is_active, is_frozen=c.is_frozen,
        )
        for c in children
    ]

    return ParentTokenResponse(
        access_token=access_token,
        parent=ParentMeRead(phone=parent.phone, name=name, children=child_reads),
    )
