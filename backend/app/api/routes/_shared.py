"""Shared route helpers — auth checks, quarter lookup, parent name resolution."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException
from app.models.lesson_session import LessonSession
from app.models.quarter import Quarter
from app.models.user import User, UserRole

# ─── Auth checks ────────────────────────────────────────────────────────────


def require_admin(user: User) -> None:
    """Allow only admin or superuser."""
    if user.role != UserRole.ADMIN.value and not user.is_superuser:
        raise ForbiddenException("Faqat admin uchun.")


def require_teacher_or_admin(user: User) -> None:
    """Allow only teacher, admin, or superuser."""
    if user.role not in (UserRole.TEACHER.value, UserRole.ADMIN.value) and not user.is_superuser:
        raise ForbiddenException("Faqat o'qituvchi yoki admin uchun.")


# ─── Quarter lookup ─────────────────────────────────────────────────────────


async def get_quarter_by_date(db: AsyncSession, target_date: date) -> Quarter | None:
    """Return the active (non-deleted) quarter that covers target_date, if any."""
    result = await db.execute(
        select(Quarter).where(
            Quarter.start_date <= target_date,
            Quarter.end_date >= target_date,
            Quarter.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def get_quarter_for_session(db: AsyncSession, session: LessonSession) -> Quarter | None:
    """Quarter covering the lesson session's date."""
    return await get_quarter_by_date(db, session.session_date)


# ─── Parent name resolution ─────────────────────────────────────────────────


def resolve_parent_name(parent_phone: str, children: list[User]) -> str:
    """Derive parent's display name from the first child whose father/mother phone matches.

    Falls back to the phone number itself if no child name is available.
    """
    for child in children:
        if child.father_phone == parent_phone and child.father_first_name:
            return f"{child.father_last_name or ''} {child.father_first_name}".strip()
        if child.mother_phone == parent_phone and child.mother_first_name:
            return f"{child.mother_last_name or ''} {child.mother_first_name}".strip()
    return parent_phone
