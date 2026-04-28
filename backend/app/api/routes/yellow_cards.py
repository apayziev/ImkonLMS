"""Yellow card routes — sariq kartochkalar."""

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.api.routes._shared import get_quarter_for_session, require_teacher_or_admin
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.lesson_session import LessonSession
from app.models.session_attendance import SessionAttendance
from app.models.yellow_card import YellowCard
from app.schemas.yellow_cards import YellowCardCreate, YellowCardRead, YellowCardSessionSummary

router = APIRouter(prefix="/yellow-cards", tags=["yellow-cards"])


def _card_to_read(card: YellowCard) -> YellowCardRead:
    return YellowCardRead(
        id=card.id,
        student_id=card.student_id,
        reason=card.reason,
        created_at=card.created_at.isoformat(),
        issued_by_name=card.issued_by.full_name if card.issued_by else "",
    )


@router.get("/session/{session_id}", response_model=YellowCardSessionSummary)
async def get_session_yellow_cards(
    session_id: int,
    db: SessionDep,
    current_user: CurrentUser,
) -> YellowCardSessionSummary:
    """Sessiya uchun sariq kartochkalar: limit + har o'quvchi bo'yicha ro'yxat."""
    session = (await db.execute(
        select(LessonSession)
        .where(LessonSession.id == session_id, LessonSession.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()
    if not session:
        raise NotFoundException("Sessiya topilmadi")

    quarter = await get_quarter_for_session(db, session)
    if not quarter:
        return YellowCardSessionSummary(limit=2, by_student={})

    student_ids = [
        row[0] for row in (await db.execute(
            select(SessionAttendance.student_id)
            .where(
                SessionAttendance.lesson_session_id == session_id,
                SessionAttendance.is_deleted == False,  # noqa: E712
            )
        )).all()
    ]
    if not student_ids:
        return YellowCardSessionSummary(limit=quarter.yellow_card_limit, by_student={})

    cards = (await db.execute(
        select(YellowCard)
        .options(selectinload(YellowCard.issued_by))
        .where(
            YellowCard.student_id.in_(student_ids),
            YellowCard.quarter_id == quarter.id,
            YellowCard.is_deleted == False,  # noqa: E712
        )
        .order_by(YellowCard.created_at)
    )).scalars().all()

    by_student: dict[int, list[YellowCardRead]] = {sid: [] for sid in student_ids}
    for card in cards:
        by_student[card.student_id].append(_card_to_read(card))

    return YellowCardSessionSummary(limit=quarter.yellow_card_limit, by_student=by_student)


@router.post("/", response_model=YellowCardRead, status_code=201)
async def issue_yellow_card(
    body: YellowCardCreate,
    db: SessionDep,
    current_user: CurrentUser,
) -> YellowCardRead:
    """O'quvchiga sariq kartochka berish (o'qituvchi)."""
    require_teacher_or_admin(current_user)

    session = (await db.execute(
        select(LessonSession)
        .where(LessonSession.id == body.session_id, LessonSession.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()
    if not session:
        raise NotFoundException("Sessiya topilmadi")

    quarter = await get_quarter_for_session(db, session)
    if not quarter:
        raise NotFoundException("Bu sessiya uchun chorak topilmadi")

    att = (await db.execute(
        select(SessionAttendance).where(
            SessionAttendance.lesson_session_id == body.session_id,
            SessionAttendance.student_id == body.student_id,
            SessionAttendance.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()
    if not att:
        raise NotFoundException("O'quvchi bu sessiyada topilmadi")

    card = YellowCard(
        student_id=body.student_id,
        quarter_id=quarter.id,
        lesson_session_id=body.session_id,
        issued_by_id=current_user.id,
        reason=body.reason,
    )
    db.add(card)
    await db.commit()
    await db.refresh(card, ["issued_by"])

    return _card_to_read(card)


@router.delete("/{card_id}", status_code=204)
async def delete_yellow_card(
    card_id: int,
    db: SessionDep,
    current_user: CurrentUser,
) -> None:
    """Sariq kartochkani o'chirish (bergan o'qituvchi yoki admin)."""
    card_q = await db.execute(
        select(YellowCard).where(YellowCard.id == card_id, YellowCard.is_deleted == False)  # noqa: E712
    )
    card = card_q.scalar_one_or_none()
    if not card:
        raise NotFoundException("Kartochka topilmadi")

    if not current_user.is_superuser and card.issued_by_id != current_user.id:
        raise ForbiddenException("Faqat kartochkani bergan o'qituvchi o'chira oladi")

    card.is_deleted = True
    await db.commit()
