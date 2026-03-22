"""CRUD operations for User model."""

from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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

    # === Student operations ===

    async def get_students(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        grade_id: int | None = None,
        search: str | None = None,
    ) -> tuple[list[User], int]:
        base = select(User).where(
            User.role == UserRole.STUDENT.value,
            User.is_deleted == False,  # noqa: E712
        )

        if grade_id is not None:
            base = base.where(User.grade_id == grade_id)

        if search:
            term = f"%{search}%"
            base = base.where(
                or_(
                    User.first_name.ilike(term),
                    User.last_name.ilike(term),
                    User.document_id.ilike(term),
                    User.student_id.ilike(term),
                )
            )

        count_q = select(func.count()).select_from(base.subquery())
        total = (await db.execute(count_q)).scalar_one()

        data_q = base.options(selectinload(User.grade)).offset(skip).limit(limit).order_by(User.id.desc())
        rows = (await db.execute(data_q)).scalars().all()

        return list(rows), total


crud_users = CRUDUser(User)
