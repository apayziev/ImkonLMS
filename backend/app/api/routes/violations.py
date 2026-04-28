"""Violation routes — qoidabuzarlik turlari va xabarlari."""

from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, CurrentUser, SessionDep, TeacherOrAdminUser
from app.api.routes._shared import get_quarter_by_date
from app.core.config import today_local
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.lesson_session import LessonSession
from app.models.session_attendance import SessionAttendance
from app.models.violation_report import ViolationReport
from app.models.violation_type import ViolationType
from app.schemas.violations import (
    ViolationReportCreate,
    ViolationReportRead,
    ViolationSessionSummary,
    ViolationTypeCreate,
    ViolationTypeRead,
    ViolationTypeUpdate,
)

router = APIRouter(prefix="/violations", tags=["violations"])


# ─── Helpers ───

def _type_to_read(vt: ViolationType) -> ViolationTypeRead:
    return ViolationTypeRead(
        id=vt.id,
        name=vt.name,
        description=vt.description,
        points=vt.points,
        is_active=vt.is_active,
    )


def _report_to_read(r: ViolationReport) -> ViolationReportRead:
    return ViolationReportRead(
        id=r.id,
        student_id=r.student_id,
        violation_type=_type_to_read(r.violation_type),
        note=r.note,
        location=r.location,
        occurred_at=r.occurred_at.isoformat(),
        reported_by_name=r.reported_by.full_name if r.reported_by else "",
        created_at=r.created_at.isoformat(),
    )


# ═══════════════════════════════════════════════════════════════
# ViolationType CRUD (admin only)
# ═══════════════════════════════════════════════════════════════

@router.get("/types", response_model=list[ViolationTypeRead])
async def list_violation_types(
    db: SessionDep,
    _: CurrentUser,
    active_only: bool = True,
) -> list[ViolationTypeRead]:
    """Barcha qoidabuzarlik turlarini olish."""
    q = select(ViolationType).where(ViolationType.is_deleted == False)  # noqa: E712
    if active_only:
        q = q.where(ViolationType.is_active == True)  # noqa: E712
    q = q.order_by(ViolationType.points, ViolationType.name)
    result = await db.execute(q)
    return [_type_to_read(vt) for vt in result.scalars().all()]


@router.post("/types", response_model=ViolationTypeRead, status_code=201)
async def create_violation_type(
    body: ViolationTypeCreate,
    db: SessionDep,
    _: AdminUser,
) -> ViolationTypeRead:
    """Yangi qoidabuzarlik turi yaratish (admin)."""
    vt = ViolationType(
        name=body.name,
        description=body.description,
        points=body.points,
    )
    db.add(vt)
    await db.commit()
    await db.refresh(vt)
    return _type_to_read(vt)


@router.put("/types/{type_id}", response_model=ViolationTypeRead)
async def update_violation_type(
    type_id: int,
    body: ViolationTypeUpdate,
    db: SessionDep,
    _: AdminUser,
) -> ViolationTypeRead:
    """Qoidabuzarlik turini tahrirlash (admin)."""
    vt = (await db.execute(
        select(ViolationType).where(
            ViolationType.id == type_id,
            ViolationType.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()
    if not vt:
        raise NotFoundException("Qoidabuzarlik turi topilmadi")

    update_data = body.model_dump(exclude_unset=True)
    if update_data:
        await db.execute(
            update(ViolationType)
            .where(ViolationType.id == type_id)
            .values(**update_data)
        )
        await db.commit()
        await db.refresh(vt)
    return _type_to_read(vt)


@router.delete("/types/{type_id}", status_code=204)
async def delete_violation_type(
    type_id: int,
    db: SessionDep,
    _: AdminUser,
) -> None:
    """Qoidabuzarlik turini o'chirish (admin, soft delete)."""
    vt = (await db.execute(
        select(ViolationType).where(
            ViolationType.id == type_id,
            ViolationType.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()
    if not vt:
        raise NotFoundException("Qoidabuzarlik turi topilmadi")
    vt.is_deleted = True
    await db.commit()


# ═══════════════════════════════════════════════════════════════
# ViolationReport (teacher)
# ═══════════════════════════════════════════════════════════════

@router.post("/reports", response_model=ViolationReportRead, status_code=201)
async def create_violation_report(
    body: ViolationReportCreate,
    db: SessionDep,
    current_user: TeacherOrAdminUser,
) -> ViolationReportRead:
    """Qoidabuzarlik haqida xabar berish (o'qituvchi)."""
    vt = (await db.execute(
        select(ViolationType).where(
            ViolationType.id == body.violation_type_id,
            ViolationType.is_deleted == False,  # noqa: E712
            ViolationType.is_active == True,  # noqa: E712
        )
    )).scalar_one_or_none()
    if not vt:
        raise NotFoundException("Qoidabuzarlik turi topilmadi")

    if body.session_id:
        session = (await db.execute(
            select(LessonSession).where(
                LessonSession.id == body.session_id,
                LessonSession.is_deleted == False,  # noqa: E712
            )
        )).scalar_one_or_none()
        if not session:
            raise NotFoundException("Sessiya topilmadi")
        quarter = await get_quarter_by_date(db, session.session_date)
    else:
        quarter = await get_quarter_by_date(db, today_local())

    if not quarter:
        raise NotFoundException("Aktiv chorak topilmadi")

    occurred = datetime.fromisoformat(body.occurred_at) if body.occurred_at else datetime.now(UTC)

    report = ViolationReport(
        student_id=body.student_id,
        violation_type_id=body.violation_type_id,
        quarter_id=quarter.id,
        session_id=body.session_id,
        reported_by_id=current_user.id,
        note=body.note,
        location=body.location,
        occurred_at=occurred,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report, ["reported_by", "violation_type"])
    return _report_to_read(report)


@router.get("/reports/session/{session_id}", response_model=ViolationSessionSummary)
async def get_session_violations(
    session_id: int,
    db: SessionDep,
    _: CurrentUser,
) -> ViolationSessionSummary:
    """Sessiya bo'yicha qoidabuzarlik xabarlari."""
    session = (await db.execute(
        select(LessonSession).where(
            LessonSession.id == session_id,
            LessonSession.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()
    if not session:
        raise NotFoundException("Sessiya topilmadi")

    student_ids = [
        row[0] for row in (await db.execute(
            select(SessionAttendance.student_id).where(
                SessionAttendance.lesson_session_id == session_id,
                SessionAttendance.is_deleted == False,  # noqa: E712
            )
        )).all()
    ]
    if not student_ids:
        return ViolationSessionSummary(by_student={})

    quarter = await get_quarter_by_date(db, session.session_date)
    if not quarter:
        return ViolationSessionSummary(by_student={})

    reports = (await db.execute(
        select(ViolationReport)
        .options(
            selectinload(ViolationReport.reported_by),
            selectinload(ViolationReport.violation_type),
        )
        .where(
            ViolationReport.student_id.in_(student_ids),
            ViolationReport.quarter_id == quarter.id,
            ViolationReport.is_deleted == False,  # noqa: E712
        )
        .order_by(ViolationReport.created_at)
    )).scalars().all()

    by_student: dict[int, list[ViolationReportRead]] = {sid: [] for sid in student_ids}
    for report in reports:
        by_student[report.student_id].append(_report_to_read(report))

    return ViolationSessionSummary(by_student=by_student)


@router.delete("/reports/{report_id}", status_code=204)
async def delete_violation_report(
    report_id: int,
    db: SessionDep,
    current_user: CurrentUser,
) -> None:
    """Qoidabuzarlik xabarini o'chirish (bergan o'qituvchi yoki admin)."""
    report = (await db.execute(
        select(ViolationReport).where(
            ViolationReport.id == report_id,
            ViolationReport.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()
    if not report:
        raise NotFoundException("Xabar topilmadi")

    if not current_user.is_superuser and report.reported_by_id != current_user.id:
        raise ForbiddenException("Faqat xabar bergan o'qituvchi o'chira oladi")

    report.is_deleted = True
    await db.commit()
