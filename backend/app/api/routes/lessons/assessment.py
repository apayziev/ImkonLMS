"""Daily BQM assessment — patch a single student's score."""

from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.enums import AttendanceStatus
from app.models.session_assessment import SessionAssessment
from app.models.session_attendance import SessionAttendance
from app.schemas.lessons import AssessmentUpdateRequest, SessionStudentAssessment

from ._helpers import _get_teacher_session, _require_not_completed, _require_teacher

router = APIRouter()


@router.patch(
    "/sessions/{session_id}/assessment",
    response_model=SessionStudentAssessment,
)
async def update_assessment(
    session_id: int,
    body: AssessmentUpdateRequest,
    db: SessionDep,
    current_user: CurrentUser,
) -> SessionStudentAssessment:
    """Upsert a student's BQM scores. Each dimension is independently optional.

    Sending {knowing: 3} only touches `knowing`; the other dimensions are left
    untouched. Sending {knowing: null} explicitly clears that dimension.
    """
    _require_teacher(current_user)

    session = await _get_teacher_session(db, session_id, current_user.id)
    _require_not_completed(session)

    # Block scoring an absent student — there's nothing to assess.
    attendance_status = (
        await db.execute(
            select(SessionAttendance.status).where(
                SessionAttendance.lesson_session_id == session_id,
                SessionAttendance.student_id == body.student_id,
                SessionAttendance.is_deleted == False,  # noqa: E712
            )
        )
    ).scalar_one_or_none()
    if attendance_status is None:
        raise NotFoundException("O'quvchi davomat yozuvi topilmadi")
    if attendance_status == AttendanceStatus.ABSENT:
        raise BadRequestException("Kelmagan o'quvchini baholash mumkin emas")

    # Patch fields only if explicitly provided in the request body.
    fields_set = body.model_fields_set
    row = (
        await db.execute(
            select(SessionAssessment).where(
                SessionAssessment.lesson_session_id == session_id,
                SessionAssessment.student_id == body.student_id,
                SessionAssessment.is_deleted == False,  # noqa: E712
            )
        )
    ).scalar_one_or_none()

    if row is None:
        row = SessionAssessment(
            lesson_session_id=session_id,
            student_id=body.student_id,
            knowing=body.knowing if "knowing" in fields_set else None,
            applying=body.applying if "applying" in fields_set else None,
            reasoning=body.reasoning if "reasoning" in fields_set else None,
            marked_at=datetime.now(UTC),
        )
        db.add(row)
    else:
        if "knowing" in fields_set:
            row.knowing = body.knowing
        if "applying" in fields_set:
            row.applying = body.applying
        if "reasoning" in fields_set:
            row.reasoning = body.reasoning
        row.marked_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(row)

    return SessionStudentAssessment(
        knowing=row.knowing, applying=row.applying, reasoning=row.reasoning
    )
