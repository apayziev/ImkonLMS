from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import async_get_db
from app.core.exceptions import UnauthorizedException
from app.core.security import TokenType, oauth2_scheme, verify_token
from app.crud.users import crud_users
from app.models.user import User

SessionDep = Annotated[AsyncSession, Depends(async_get_db)]


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: SessionDep) -> User:
    token_data = verify_token(token, TokenType.ACCESS)
    if token_data is None:
        raise UnauthorizedException("Foydalanuvchi autentifikatsiyadan o'tmagan.")

    user = await crud_users.get_by_document_id(db=db, document_id=token_data["document_id"])
    if not user:
        raise UnauthorizedException("Foydalanuvchi topilmadi.")
    if not user.is_active:
        raise UnauthorizedException("Foydalanuvchi faol emas.")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
