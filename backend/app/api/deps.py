from typing import Annotated

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import async_get_db
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import TokenType, oauth2_scheme, verify_token
from app.crud.users import crud_users
from app.models.parent_auth import ParentAuth
from app.models.user import User, UserRole

SessionDep = Annotated[AsyncSession, Depends(async_get_db)]


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: SessionDep) -> User:
    token_data = verify_token(token, TokenType.ACCESS)
    if token_data is None:
        raise UnauthorizedException("Foydalanuvchi autentifikatsiyadan o'tmagan.")

    if token_data.get("role") == "parent":
        raise ForbiddenException("Ota-ona hisobi ushbu sahifaga kira olmaydi.")

    user = await crud_users.get_by_document_id(db=db, document_id=token_data["document_id"])
    if not user:
        raise UnauthorizedException("Foydalanuvchi topilmadi.")
    if not user.is_active:
        raise UnauthorizedException("Foydalanuvchi faol emas.")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise ForbiddenException("Faqat administrator uchun.")
    return current_user


SuperUser = Annotated[User, Depends(get_current_superuser)]


async def get_current_admin(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.ADMIN.value and not current_user.is_superuser:
        raise ForbiddenException("Faqat admin uchun.")
    return current_user


AdminUser = Annotated[User, Depends(get_current_admin)]


async def get_current_teacher_or_admin(current_user: CurrentUser) -> User:
    if current_user.role not in (UserRole.TEACHER.value, UserRole.ADMIN.value) and not current_user.is_superuser:
        raise ForbiddenException("Faqat o'qituvchi yoki admin uchun.")
    return current_user


TeacherOrAdminUser = Annotated[User, Depends(get_current_teacher_or_admin)]


async def get_current_parent(token: Annotated[str, Depends(oauth2_scheme)], db: SessionDep) -> ParentAuth:
    token_data = verify_token(token, TokenType.ACCESS)
    if token_data is None:
        raise UnauthorizedException("Autentifikatsiyadan o'tmagan.")

    if token_data.get("role") != "parent":
        raise ForbiddenException("Faqat ota-ona uchun.")

    phone = token_data["document_id"]  # sub = phone for parent tokens
    result = await db.execute(
        select(ParentAuth).where(ParentAuth.phone == phone, ParentAuth.is_active == True)  # noqa: E712
    )
    parent = result.scalar_one_or_none()
    if not parent:
        raise UnauthorizedException("Ota-ona hisobi topilmadi.")

    return parent


CurrentParent = Annotated[ParentAuth, Depends(get_current_parent)]
