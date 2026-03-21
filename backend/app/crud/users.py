"""CRUD operations for User model."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole
from app.schemas.users import UserCreate, UserUpdate

from .base import BaseCRUD


class CRUDUser(BaseCRUD[User]):

    async def get_by_document_id(
        self,
        db: AsyncSession,
        document_id: str,
    ) -> User | None:
        return await self.get(db, document_id=document_id)

    async def create(self, db: AsyncSession, user_create: UserCreate) -> User:
        hashed_password = get_password_hash(user_create.password) if user_create.password else None
        user_data = user_create.model_dump(exclude={"password"})
        db_user = User(**user_data, hashed_password=hashed_password)
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    async def update(
        self,
        db: AsyncSession,
        db_user: User,
        user_update: UserUpdate | dict[str, Any],
    ) -> User:
        if isinstance(user_update, dict):
            update_data = user_update
        else:
            update_data = user_update.model_dump(exclude_unset=True)

        if "password" in update_data:
            password = update_data.pop("password")
            update_data["hashed_password"] = get_password_hash(password)

        for field, value in update_data.items():
            setattr(db_user, field, value)

        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    async def authenticate(
        self,
        db: AsyncSession,
        document_id: str,
        password: str,
    ) -> User | None:
        db_user = await self.get_by_document_id(db, document_id=document_id)
        if db_user is None or not db_user.hashed_password:
            return None
        if not verify_password(password, db_user.hashed_password):
            return None
        return db_user

    async def authenticate_student(
        self,
        db: AsyncSession,
        document_id: str,
    ) -> User | None:
        """Passwordless student login — identity verified physically."""
        db_user = await self.get_by_document_id(db, document_id=document_id)
        if db_user is None:
            return None
        if db_user.role != UserRole.STUDENT.value:
            return None
        return db_user


crud_users = CRUDUser(User)
