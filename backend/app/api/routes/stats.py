"""Aggregated statistics — dashboard counts."""

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.grade import Grade
from app.models.subject import Subject
from app.models.user import User, UserRole

router = APIRouter(prefix="/stats", tags=["stats"])


class DashboardStats(BaseModel):
    students: int
    teachers: int
    subjects: int
    grades: int


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(db: SessionDep, _: CurrentUser) -> DashboardStats:
    """Single-query dashboard counts (vs. fetching each list endpoint)."""
    user_q = (
        select(User.role, func.count())
        .where(User.is_deleted.is_(False))
        .group_by(User.role)
    )
    role_counts: dict[str, int] = dict((await db.execute(user_q)).all())

    subjects = (
        await db.execute(
            select(func.count()).select_from(Subject).where(Subject.is_deleted.is_(False))
        )
    ).scalar_one()
    grades = (
        await db.execute(
            select(func.count()).select_from(Grade).where(Grade.is_deleted.is_(False))
        )
    ).scalar_one()

    return DashboardStats(
        students=role_counts.get(UserRole.STUDENT.value, 0),
        teachers=role_counts.get(UserRole.TEACHER.value, 0),
        subjects=subjects,
        grades=grades,
    )
