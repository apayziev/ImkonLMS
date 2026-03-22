"""Sync students and grades from Payment system (single source of truth)."""

import logging

import httpx
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import SessionDep, SuperUser
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.grade import Grade
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sync", tags=["sync"])

SYNC_TIMEOUT = 30.0


@router.post("/students")
async def sync_from_payment(db: SessionDep, _current_user: SuperUser) -> dict:
    """Pull grades and students from Payment and upsert into LMS."""
    if not settings.PAYMENT_SYNC_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sinxronizatsiya sozlanmagan",
        )

    # Fetch data from Payment
    url = f"{settings.PAYMENT_API_URL.rstrip('/')}/api/v1/sync/export"
    try:
        async with httpx.AsyncClient(timeout=SYNC_TIMEOUT) as client:
            resp = await client.get(url, headers={"X-Sync-Api-Key": settings.PAYMENT_SYNC_API_KEY})
            resp.raise_for_status()
            data = resp.json()
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

    payment_grades: list[dict] = data.get("grades", [])
    payment_students: list[dict] = data.get("students", [])

    # === Upsert Grades ===
    # Build lookup: (level, section) -> LMS Grade
    existing_grades = (await db.execute(select(Grade))).scalars().all()
    grade_map: dict[tuple[int, str], Grade] = {(g.level, g.section): g for g in existing_grades}

    grades_created = 0
    # Map Payment grade_id -> LMS grade_id
    payment_to_lms_grade: dict[int, int] = {}

    for pg in payment_grades:
        key = (pg["level"], pg["section"])
        if key in grade_map:
            lms_grade = grade_map[key]
        else:
            lms_grade = Grade(level=pg["level"], section=pg["section"])
            db.add(lms_grade)
            await db.flush()
            grade_map[key] = lms_grade
            grades_created += 1
        payment_to_lms_grade[pg["id"]] = lms_grade.id

    # === Upsert Students ===
    # Build lookup: document_id -> LMS User
    existing_students_result = await db.execute(
        select(User).where(User.role == UserRole.STUDENT.value)
    )
    student_map: dict[str, User] = {s.document_id: s for s in existing_students_result.scalars().all()}

    students_created = 0
    students_updated = 0

    # Fields to sync from Payment -> LMS
    sync_fields = [
        "first_name", "last_name", "middle_name", "birth_date", "gender",
        "phone_number", "student_id",
        "father_first_name", "father_last_name", "father_phone",
        "mother_first_name", "mother_last_name", "mother_phone",
        "address", "enrollment_date", "withdrawal_date",
        "is_active", "is_frozen", "frozen_at", "frozen_reason",
        "departure_date", "return_date", "is_deleted", "deleted_at",
    ]

    for ps in payment_students:
        doc_id = ps.get("document_id")
        if not doc_id:
            continue

        # Resolve LMS grade_id from Payment grade_id
        payment_grade_id = ps.get("grade_id")
        lms_grade_id = payment_to_lms_grade.get(payment_grade_id) if payment_grade_id else None

        existing = student_map.get(doc_id)
        if existing:
            # Update existing student
            changed = False
            for field in sync_fields:
                if field in ps:
                    new_val = ps[field]
                    if getattr(existing, field, None) != new_val:
                        setattr(existing, field, new_val)
                        changed = True
            if existing.grade_id != lms_grade_id:
                existing.grade_id = lms_grade_id
                changed = True
            if changed:
                students_updated += 1
        else:
            # Create new student
            student_data = {f: ps.get(f) for f in sync_fields if f in ps}
            student_data["document_id"] = doc_id
            student_data["grade_id"] = lms_grade_id
            student_data["role"] = UserRole.STUDENT.value
            student_data["hashed_password"] = get_password_hash(doc_id)
            new_student = User(**student_data)
            db.add(new_student)
            student_map[doc_id] = new_student
            students_created += 1

    await db.commit()

    return {
        "message": "Sinxronizatsiya muvaffaqiyatli yakunlandi",
        "grades_created": grades_created,
        "students_created": students_created,
        "students_updated": students_updated,
        "total_students": len(payment_students),
    }
