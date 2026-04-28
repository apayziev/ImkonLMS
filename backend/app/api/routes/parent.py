"""Parent portal API routes — read-only access to child data."""

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentParent, SessionDep
from app.api.routes._shared import resolve_parent_name
from app.core.exceptions import ForbiddenException
from app.core.pagination import DEFAULT_LIMIT, LimitQuery
from app.models.grade import Grade
from app.models.lesson_plan import LessonPlan
from app.models.lesson_session import LessonSession
from app.models.schedule_entry import ScheduleEntry
from app.models.session_attendance import SessionAttendance
from app.models.subject import Subject
from app.models.time_slot import TimeSlot
from app.models.user import User, UserRole
from app.models.violation_report import ViolationReport
from app.schemas.parent import (
    AttendanceSummary,
    ChildAttendanceRecord,
    ChildAttendanceResponse,
    ChildDisciplineResponse,
    ChildHomeworkItem,
    ChildHomeworkResponse,
    ChildTimetableEntry,
    ChildTimetableResponse,
    ChildViolationItem,
    ParentChildRead,
    ParentMeRead,
)

router = APIRouter(prefix="/parent", tags=["parent"])


async def _get_children(db, parent_phone: str) -> list[User]:
    result = await db.execute(
        select(User).where(
            User.role == UserRole.STUDENT.value,
            User.is_deleted == False,  # noqa: E712
            (User.father_phone == parent_phone) | (User.mother_phone == parent_phone),
        )
    )
    return list(result.scalars().all())


async def _verify_child(db, parent_phone: str, student_id: int) -> User:
    """Verify parent has access to this student."""
    result = await db.execute(
        select(User).where(
            User.id == student_id,
            User.role == UserRole.STUDENT.value,
            User.is_deleted == False,  # noqa: E712
            (User.father_phone == parent_phone) | (User.mother_phone == parent_phone),
        )
    )
    child = result.scalar_one_or_none()
    if not child:
        raise ForbiddenException("Bu o'quvchi sizning farzandingiz emas.")
    return child


@router.get("/me", response_model=ParentMeRead)
async def get_parent_info(parent: CurrentParent, db: SessionDep) -> ParentMeRead:
    """Ota-ona ma'lumotlari va farzandlar ro'yxati."""
    children = await _get_children(db, parent.phone)
    name = resolve_parent_name(parent.phone, children)

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

    return ParentMeRead(phone=parent.phone, name=name, children=child_reads)


@router.get("/children/{student_id}/attendance", response_model=ChildAttendanceResponse)
async def get_child_attendance(
    student_id: int,
    parent: CurrentParent,
    db: SessionDep,
    start_date: str | None = Query(None, description="YYYY-MM-DD"),
    end_date: str | None = Query(None, description="YYYY-MM-DD"),
) -> ChildAttendanceResponse:
    """Farzandning davomat tarixi."""
    await _verify_child(db, parent.phone, student_id)

    query = (
        select(
            SessionAttendance.status,
            LessonSession.session_date,
            Subject.name.label("subject_name"),
            TimeSlot.period_number,
            TimeSlot.start_time,
            TimeSlot.end_time,
        )
        .join(LessonSession, SessionAttendance.lesson_session_id == LessonSession.id)
        .join(ScheduleEntry, LessonSession.schedule_entry_id == ScheduleEntry.id)
        .join(Subject, ScheduleEntry.subject_id == Subject.id)
        .join(TimeSlot, ScheduleEntry.time_slot_id == TimeSlot.id)
        .where(
            SessionAttendance.student_id == student_id,
            SessionAttendance.is_deleted == False,  # noqa: E712
            SessionAttendance.status != "unmarked",
        )
        .order_by(LessonSession.session_date.desc(), TimeSlot.period_number)
    )

    if start_date:
        query = query.where(LessonSession.session_date >= start_date)
    if end_date:
        query = query.where(LessonSession.session_date <= end_date)

    result = await db.execute(query)
    rows = result.all()

    records = []
    summary = AttendanceSummary()
    for row in rows:
        records.append(
            ChildAttendanceRecord(
                date=str(row.session_date),
                subject_name=row.subject_name,
                period_number=row.period_number,
                start_time=str(row.start_time),
                end_time=str(row.end_time),
                status=row.status,
            )
        )
        summary.total += 1
        if row.status == "present":
            summary.present += 1
        elif row.status == "late":
            summary.late += 1
        elif row.status == "absent":
            summary.absent += 1

    return ChildAttendanceResponse(records=records, summary=summary)


@router.get("/children/{student_id}/timetable", response_model=ChildTimetableResponse)
async def get_child_timetable(
    student_id: int,
    parent: CurrentParent,
    db: SessionDep,
) -> ChildTimetableResponse:
    """Farzandning haftalik dars jadvali."""
    child = await _verify_child(db, parent.phone, student_id)

    if not child.grade_id:
        return ChildTimetableResponse(entries=[])

    query = (
        select(
            ScheduleEntry.day_of_week,
            ScheduleEntry.room,
            Subject.name.label("subject_name"),
            TimeSlot.period_number,
            TimeSlot.start_time,
            TimeSlot.end_time,
            User.first_name.label("teacher_first"),
            User.last_name.label("teacher_last"),
        )
        .join(Subject, ScheduleEntry.subject_id == Subject.id)
        .join(TimeSlot, ScheduleEntry.time_slot_id == TimeSlot.id)
        .join(User, ScheduleEntry.teacher_id == User.id)
        .where(
            ScheduleEntry.grade_id == child.grade_id,
            ScheduleEntry.is_deleted == False,  # noqa: E712
        )
        .order_by(ScheduleEntry.day_of_week, TimeSlot.period_number)
    )

    result = await db.execute(query)
    rows = result.all()

    entries = [
        ChildTimetableEntry(
            day_of_week=row.day_of_week,
            period_number=row.period_number,
            start_time=str(row.start_time),
            end_time=str(row.end_time),
            subject_name=row.subject_name,
            teacher_name=f"{row.teacher_last} {row.teacher_first}",
            room=row.room,
        )
        for row in rows
    ]

    return ChildTimetableResponse(entries=entries)


@router.get("/children/{student_id}/homework", response_model=ChildHomeworkResponse)
async def get_child_homework(
    student_id: int,
    parent: CurrentParent,
    db: SessionDep,
    limit: LimitQuery = DEFAULT_LIMIT,
) -> ChildHomeworkResponse:
    """Farzandga berilgan uyga vazifalar."""
    child = await _verify_child(db, parent.phone, student_id)

    if not child.grade_id:
        return ChildHomeworkResponse(items=[])

    query = (
        select(
            LessonPlan.topic,
            LessonPlan.homework,
            LessonPlan.homework_deadline,
            LessonPlan.plan_date,
            Subject.name.label("subject_name"),
            User.first_name.label("teacher_first"),
            User.last_name.label("teacher_last"),
        )
        .join(ScheduleEntry, LessonPlan.schedule_entry_id == ScheduleEntry.id)
        .join(Subject, ScheduleEntry.subject_id == Subject.id)
        .join(User, ScheduleEntry.teacher_id == User.id)
        .where(
            ScheduleEntry.grade_id == child.grade_id,
            LessonPlan.is_deleted == False,  # noqa: E712
            LessonPlan.homework.isnot(None),
            LessonPlan.homework != "",
        )
        .order_by(LessonPlan.plan_date.desc())
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    items = [
        ChildHomeworkItem(
            subject_name=row.subject_name,
            topic=row.topic,
            homework=row.homework,
            homework_deadline=(
                str(row.homework_deadline) if row.homework_deadline else None
            ),
            plan_date=str(row.plan_date),
            teacher_name=f"{row.teacher_last} {row.teacher_first}",
        )
        for row in rows
    ]

    return ChildHomeworkResponse(items=items)


@router.get("/children/{student_id}/discipline", response_model=ChildDisciplineResponse)
async def get_child_discipline(
    student_id: int,
    parent: CurrentParent,
    db: SessionDep,
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
) -> ChildDisciplineResponse:
    """Farzandning intizom holati — qoidabuzarliklar va ballar."""
    await _verify_child(db, parent.phone, student_id)

    # Violations
    v_query = (
        select(ViolationReport)
        .options(
            selectinload(ViolationReport.violation_type),
            selectinload(ViolationReport.reported_by),
        )
        .where(
            ViolationReport.student_id == student_id,
            ViolationReport.is_deleted == False,  # noqa: E712
        )
        .order_by(ViolationReport.occurred_at.desc())
    )
    if start_date:
        v_query = v_query.where(func.date(ViolationReport.occurred_at) >= start_date)
    if end_date:
        v_query = v_query.where(func.date(ViolationReport.occurred_at) <= end_date)

    v_result = await db.execute(v_query)
    violations = v_result.scalars().all()

    total_points = sum(v.violation_type.points for v in violations)

    return ChildDisciplineResponse(
        violations=[
            ChildViolationItem(
                violation_type=v.violation_type.name,
                points=v.violation_type.points,
                note=v.note,
                location=v.location,
                occurred_at=v.occurred_at.isoformat(),
                reported_by=v.reported_by.full_name,
            )
            for v in violations
        ],
        total_violation_points=total_points,
    )
