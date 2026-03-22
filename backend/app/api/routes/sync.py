"""Sync all shared data from Payment system (single source of truth)."""

import logging
from datetime import date, datetime

import httpx
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import SessionDep, SuperUser
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.grade import Grade
from app.models.subject import Subject
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sync", tags=["sync"])

SYNC_TIMEOUT = 30.0

# Fields that need date string -> date object conversion
_DATE_FIELDS = {
    "birth_date", "enrollment_date", "withdrawal_date",
    "frozen_at", "departure_date", "return_date", "deleted_at",
}


def _parse_date(value: str | None) -> date | None:
    """Convert ISO date string to date object."""
    if not value:
        return None
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


async def _fetch_payment_data() -> dict:
    """Fetch export data from Payment system."""
    if not settings.PAYMENT_SYNC_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sinxronizatsiya sozlanmagan",
        )

    url = f"{settings.PAYMENT_API_URL.rstrip('/')}/api/v1/sync/export"
    try:
        async with httpx.AsyncClient(timeout=SYNC_TIMEOUT) as client:
            resp = await client.get(url, headers={"X-Sync-Api-Key": settings.PAYMENT_SYNC_API_KEY})
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        logger.error("Payment sync HTTP error: %s", e.response.status_code)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Payment tizimidan xatolik: {e.response.status_code}",
        ) from e
    except httpx.RequestError as e:
        logger.error("Payment sync connection error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment tizimiga ulanib bo'lmadi",
        ) from e


async def _sync_grades(db: SessionDep, payment_grades: list[dict]) -> tuple[int, dict[int, int]]:
    """Upsert grades and return (created_count, payment_id_to_lms_id_map)."""
    existing = (await db.execute(select(Grade))).scalars().all()
    grade_map: dict[tuple[int, str], Grade] = {(g.level, g.section): g for g in existing}

    created = 0
    payment_to_lms: dict[int, int] = {}

    for pg in payment_grades:
        key = (pg["level"], pg["section"])
        if key in grade_map:
            lms_grade = grade_map[key]
        else:
            lms_grade = Grade(level=pg["level"], section=pg["section"])
            db.add(lms_grade)
            await db.flush()
            grade_map[key] = lms_grade
            created += 1
        payment_to_lms[pg["id"]] = lms_grade.id

    return created, payment_to_lms


async def _sync_subjects(db: SessionDep, payment_subjects: list[dict]) -> int:
    """Upsert subjects by name. Returns created count."""
    existing = (await db.execute(select(Subject))).scalars().all()
    subject_map: dict[str, Subject] = {s.name: s for s in existing}

    created = 0
    for ps in payment_subjects:
        name = ps.get("name")
        if not name:
            continue
        if name not in subject_map:
            new_subject = Subject(name=name)
            db.add(new_subject)
            subject_map[name] = new_subject
            created += 1

    await db.flush()
    return created


async def _sync_students(
    db: SessionDep,
    payment_students: list[dict],
    grade_map: dict[int, int],
) -> tuple[int, int]:
    """Upsert students by document_id. Returns (created, updated)."""
    existing_result = await db.execute(
        select(User).where(User.role == UserRole.STUDENT.value)
    )
    student_map: dict[str, User] = {s.document_id: s for s in existing_result.scalars().all()}

    sync_fields = [
        "first_name", "last_name", "middle_name", "birth_date", "gender",
        "phone_number", "student_id",
        "father_first_name", "father_last_name", "father_phone",
        "mother_first_name", "mother_last_name", "mother_phone",
        "address", "enrollment_date", "withdrawal_date",
        "is_active", "is_frozen", "frozen_at", "frozen_reason",
        "departure_date", "return_date", "is_deleted", "deleted_at",
    ]

    created = updated = 0

    for ps in payment_students:
        doc_id = ps.get("document_id")
        if not doc_id:
            continue

        lms_grade_id = grade_map.get(ps.get("grade_id")) if ps.get("grade_id") else None
        existing = student_map.get(doc_id)

        if existing:
            changed = False
            for field in sync_fields:
                if field in ps:
                    new_val = _parse_date(ps[field]) if field in _DATE_FIELDS else ps[field]
                    if getattr(existing, field, None) != new_val:
                        setattr(existing, field, new_val)
                        changed = True
            if existing.grade_id != lms_grade_id:
                existing.grade_id = lms_grade_id
                changed = True
            if changed:
                updated += 1
        else:
            student_data = {}
            for f in sync_fields:
                if f in ps:
                    student_data[f] = _parse_date(ps[f]) if f in _DATE_FIELDS else ps[f]
            student_data["document_id"] = doc_id
            student_data["grade_id"] = lms_grade_id
            student_data["role"] = UserRole.STUDENT.value
            student_data["hashed_password"] = get_password_hash(doc_id)
            new_student = User(**student_data)
            db.add(new_student)
            student_map[doc_id] = new_student
            created += 1

    return created, updated


async def _sync_teachers(
    db: SessionDep,
    payment_teachers: list[dict],
    grade_map: dict[int, int],
) -> tuple[int, int]:
    """Upsert teachers by document_id. Returns (created, updated)."""
    existing_result = await db.execute(
        select(User).where(User.role == UserRole.TEACHER.value)
    )
    teacher_map: dict[str, User] = {t.document_id: t for t in existing_result.scalars().all()}

    sync_fields = [
        "first_name", "last_name", "middle_name", "birth_date", "gender",
        "phone_number", "photo_url", "is_active", "is_deleted", "subjects",
    ]

    created = updated = 0

    for pt in payment_teachers:
        doc_id = pt.get("document_id")
        if not doc_id:
            continue

        payment_ct_grade_id = pt.get("class_teacher_grade_id")
        lms_ct_grade_id = grade_map.get(payment_ct_grade_id) if payment_ct_grade_id else None
        existing = teacher_map.get(doc_id)

        if existing:
            changed = False
            for field in sync_fields:
                if field in pt:
                    new_val = _parse_date(pt[field]) if field in _DATE_FIELDS else pt[field]
                    if getattr(existing, field, None) != new_val:
                        setattr(existing, field, new_val)
                        changed = True
            if existing.class_teacher_grade_id != lms_ct_grade_id:
                existing.class_teacher_grade_id = lms_ct_grade_id
                changed = True
            if changed:
                updated += 1
        else:
            teacher_data = {}
            for f in sync_fields:
                if f in pt:
                    teacher_data[f] = _parse_date(pt[f]) if f in _DATE_FIELDS else pt[f]
            teacher_data["document_id"] = doc_id
            teacher_data["class_teacher_grade_id"] = lms_ct_grade_id
            teacher_data["role"] = UserRole.TEACHER.value
            teacher_data["hashed_password"] = get_password_hash(doc_id)
            new_teacher = User(**teacher_data)
            db.add(new_teacher)
            teacher_map[doc_id] = new_teacher
            created += 1

    return created, updated


@router.post("/all")
async def sync_from_payment(db: SessionDep, _current_user: SuperUser) -> dict:
    """Pull all shared data from Payment and upsert into LMS."""
    data = await _fetch_payment_data()

    grades_created, grade_map = await _sync_grades(db, data.get("grades", []))
    subjects_created = await _sync_subjects(db, data.get("subjects", []))
    students_created, students_updated = await _sync_students(
        db, data.get("students", []), grade_map,
    )
    teachers_created, teachers_updated = await _sync_teachers(
        db, data.get("teachers", []), grade_map,
    )

    await db.commit()

    result = {
        "message": "Sinxronizatsiya muvaffaqiyatli yakunlandi",
        "grades_created": grades_created,
        "subjects_created": subjects_created,
        "students_created": students_created,
        "students_updated": students_updated,
        "teachers_created": teachers_created,
        "teachers_updated": teachers_updated,
        "total_students": len(data.get("students", [])),
        "total_teachers": len(data.get("teachers", [])),
    }

    logger.info(
        "Sync completed by %s: grades=%d, subjects=%d, "
        "students=%d/%d, teachers=%d/%d",
        _current_user.document_id,
        grades_created, subjects_created,
        students_created, students_updated,
        teachers_created, teachers_updated,
    )

    return result
