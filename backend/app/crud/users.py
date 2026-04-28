"""CRUD operations for User model."""

from functools import cache
from typing import ClassVar

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole

from .base import BaseCRUD


@cache
def _dummy_hash() -> str:
    """Constant-time bcrypt comparison target for missing users.

    Lazily computed on first auth attempt so each gunicorn worker doesn't pay
    the ~100ms bcrypt cost at import time.
    """
    return get_password_hash("dummy-password-for-timing-safety")


class CRUDUser(BaseCRUD[User]):
    # Sensitive fields — must be set via dedicated methods, not generic update().
    PROTECTED_FIELDS: ClassVar[frozenset[str]] = BaseCRUD.PROTECTED_FIELDS | {
        "hashed_password", "role", "is_superuser",
    }

    @staticmethod
    def _apply_search(query, search: str | None, fields: list):
        """Apply ilike search across given fields."""
        if not search:
            return query
        term = f"%{search}%"
        return query.where(or_(*[f.ilike(term) for f in fields]))

    async def get_by_phone_number(
        self,
        db: AsyncSession,
        phone_number: str,
    ) -> User | None:
        """Get user by phone number."""
        normalized = phone_number.replace(" ", "").replace("-", "")
        result = await db.execute(
            select(User).where(User.phone_number == normalized, User.is_deleted == False)  # noqa: E712
        )
        return result.scalar_one_or_none()

    async def get_by_document_id(
        self,
        db: AsyncSession,
        document_id: str,
    ) -> User | None:
        normalized = document_id.upper().replace(" ", "")
        result = await db.execute(
            select(User).where(User.document_id == normalized, User.is_deleted == False)  # noqa: E712
        )
        return result.scalar_one_or_none()

    async def authenticate(
        self,
        db: AsyncSession,
        *,
        username: str,
        password: str,
    ) -> User | None:
        """Authenticate by phone or document_id."""
        user = None
        if username.startswith("+") or username.isdigit():
            user = await self.get_by_phone_number(db, phone_number=username)
        if not user:
            user = await self.get_by_document_id(db, document_id=username)

        hashed = user.hashed_password if user and user.hashed_password else _dummy_hash()
        if not verify_password(password, hashed):
            return None
        if not user:
            return None
        return user

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
        if db_user.is_frozen:
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
        status: str | None = None,
        grade_ids: list[int] | None = None,
    ) -> tuple[list[User], int]:
        base = select(User).where(
            User.role == UserRole.STUDENT.value,
            User.is_deleted == False,  # noqa: E712
        )

        if grade_ids is not None:
            base = base.where(User.grade_id.in_(grade_ids))

        if grade_id is not None:
            base = base.where(User.grade_id == grade_id)

        if status == "active":
            base = base.where(User.is_active == True, User.is_frozen == False)  # noqa: E712
        elif status == "frozen":
            base = base.where(User.is_frozen == True)  # noqa: E712
        elif status == "inactive":
            base = base.where(User.is_active == False, User.is_frozen == False)  # noqa: E712

        base = self._apply_search(base, search, [
            User.first_name, User.last_name, User.document_id,
            User.student_id, User.phone_number,
        ])

        return await self._paginate_query(
            db, base,
            options=[selectinload(User.grade)],
            order_by=User.id.desc(),
            offset=skip, limit=limit,
        )

    async def get_deleted_students(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
    ) -> tuple[list[User], int]:
        base = select(User).where(
            User.role == UserRole.STUDENT.value,
            User.is_deleted == True,  # noqa: E712
        )

        base = self._apply_search(base, search, [
            User.first_name, User.last_name, User.document_id, User.student_id,
        ])

        return await self._paginate_query(
            db, base,
            options=[selectinload(User.grade)],
            order_by=User.id.desc(),
            offset=skip, limit=limit,
        )

    async def hard_delete(self, db: AsyncSession, *, id: int) -> bool:
        user = await self.get(db, id=id, is_deleted=True)
        if user is None:
            return False
        await db.delete(user)
        await db.commit()
        return True

    # === Teacher operations ===

    async def get_teachers(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
    ) -> tuple[list[User], int]:
        base = select(User).where(
            User.role == UserRole.TEACHER.value,
            User.is_deleted == False,  # noqa: E712
        )

        base = self._apply_search(base, search, [
            User.first_name, User.last_name, User.document_id, User.phone_number,
        ])

        return await self._paginate_query(
            db, base,
            options=[selectinload(User.class_teacher_grade)],
            order_by=(User.last_name, User.first_name),
            offset=skip, limit=limit,
        )


crud_users = CRUDUser(User)
