"""CRUD operations for User model."""

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole

from .base import BaseCRUD

_DUMMY_HASH = get_password_hash("dummy-password-for-timing-safety")


class CRUDUser(BaseCRUD[User]):

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

        hashed = user.hashed_password if user and user.hashed_password else _DUMMY_HASH
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
    ) -> tuple[list[User], int]:
        base = select(User).where(
            User.role == UserRole.STUDENT.value,
            User.is_deleted == False,  # noqa: E712
        )

        if grade_id is not None:
            base = base.where(User.grade_id == grade_id)

        if status == "active":
            base = base.where(User.is_active == True, User.is_frozen == False)  # noqa: E712
        elif status == "frozen":
            base = base.where(User.is_frozen == True)  # noqa: E712
        elif status == "inactive":
            base = base.where(User.is_active == False, User.is_frozen == False)  # noqa: E712

        if search:
            term = f"%{search}%"
            base = base.where(
                or_(
                    User.first_name.ilike(term),
                    User.last_name.ilike(term),
                    User.document_id.ilike(term),
                    User.student_id.ilike(term),
                    User.phone_number.ilike(term),
                )
            )

        count_q = select(func.count()).select_from(base.subquery())
        total = (await db.execute(count_q)).scalar_one()

        data_q = base.options(selectinload(User.grade)).offset(skip).limit(limit).order_by(User.id.desc())
        rows = (await db.execute(data_q)).scalars().all()

        return list(rows), total

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

        if search:
            term = f"%{search}%"
            base = base.where(
                or_(
                    User.first_name.ilike(term),
                    User.last_name.ilike(term),
                    User.document_id.ilike(term),
                    User.phone_number.ilike(term),
                )
            )

        count_q = select(func.count()).select_from(base.subquery())
        total = (await db.execute(count_q)).scalar_one()

        data_q = (
            base.options(selectinload(User.class_teacher_grade))
            .offset(skip)
            .limit(limit)
            .order_by(User.last_name, User.first_name)
        )
        rows = (await db.execute(data_q)).scalars().all()

        return list(rows), total


crud_users = CRUDUser(User)
