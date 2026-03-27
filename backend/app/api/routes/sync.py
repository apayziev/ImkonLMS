"""Sync all shared data from Payment system (single source of truth)."""

import asyncio
import logging
from datetime import date, datetime

import httpx
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SessionDep, SuperUser
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.academic_year import AcademicYear
from app.models.grade import Grade
from app.models.subject import Subject
from app.models.sync_log import SyncLog
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


async def _fetch_payment_data(updated_after: datetime | None = None) -> dict:
    """Fetch export data from Payment system. Pass updated_after for incremental sync."""
    if not settings.PAYMENT_SYNC_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sinxronizatsiya sozlanmagan",
        )

    url = f"{settings.PAYMENT_API_URL.rstrip('/')}/api/v1/sync/export"
    params = {}
    if updated_after:
        params["updated_after"] = updated_after.isoformat()

    try:
        async with httpx.AsyncClient(timeout=SYNC_TIMEOUT) as client:
            resp = await client.get(
                url,
                headers={"X-Sync-Api-Key": settings.PAYMENT_SYNC_API_KEY},
                params=params,
            )
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


async def _sync_academic_years(db: SessionDep, payment_years: list[dict]) -> tuple[int, int, int]:
    """Upsert academic years by name. Returns (created, updated, deactivated)."""
    existing = (await db.execute(select(AcademicYear))).scalars().all()
    year_map: dict[str, AcademicYear] = {a.name: a for a in existing}
    pms_names: set[str] = set()

    created = updated = deactivated = 0

    for pa in payment_years:
        name = pa.get("name")
        if not name:
            continue
        pms_names.add(name)

        if name in year_map:
            ay = year_map[name]
            changed = False
            for field in ("start_year", "end_year", "start_month", "end_month", "is_current"):
                if pa.get(field) is not None and getattr(ay, field) != pa[field]:
                    setattr(ay, field, pa[field])
                    changed = True
            # Restore if previously soft-deleted
            if ay.is_deleted and not pa.get("is_deleted", False):
                ay.is_deleted = False
                changed = True
            if changed:
                updated += 1
        else:
            new_ay = AcademicYear(
                name=name,
                start_year=pa["start_year"],
                end_year=pa["end_year"],
                start_month=pa.get("start_month", 9),
                end_month=pa.get("end_month", 6),
                is_current=pa.get("is_current", False),
                is_deleted=pa.get("is_deleted", False),
            )
            db.add(new_ay)
            year_map[name] = new_ay
            created += 1

    # Soft-delete LMS years no longer present in PMS
    for name, ay in year_map.items():
        if name not in pms_names and not ay.is_deleted:
            ay.is_deleted = True
            deactivated += 1

    await db.flush()
    return created, updated, deactivated


async def _sync_grades(db: SessionDep, payment_grades: list[dict]) -> tuple[int, int, dict[int, int]]:
    """Upsert grades and return (created_count, deactivated_count, payment_id_to_lms_id_map)."""
    existing = (await db.execute(select(Grade))).scalars().all()
    grade_map: dict[tuple[int, str], Grade] = {(g.level, g.section): g for g in existing}

    created = 0
    payment_to_lms: dict[int, int] = {}
    pms_keys: set[tuple[int, str]] = set()
    # Track new Grade objects so we can build payment_to_lms after a single flush
    new_grades: list[tuple[int, Grade]] = []  # (payment_id, Grade)

    for pg in payment_grades:
        key = (pg["level"], pg["section"])
        pms_keys.add(key)
        if key in grade_map:
            lms_grade = grade_map[key]
            # Restore if previously soft-deleted
            if lms_grade.is_deleted:
                lms_grade.is_deleted = False
            payment_to_lms[pg["id"]] = lms_grade.id
        else:
            lms_grade = Grade(level=pg["level"], section=pg["section"])
            db.add(lms_grade)
            grade_map[key] = lms_grade
            new_grades.append((pg["id"], lms_grade))
            created += 1

    # Soft-delete LMS grades no longer present in PMS export
    deactivated = 0
    for key, lms_grade in grade_map.items():
        if key not in pms_keys and not lms_grade.is_deleted:
            lms_grade.is_deleted = True
            deactivated += 1

    # Single flush — auto-increment IDs are populated for all new Grade rows at once
    await db.flush()
    for payment_id, lms_grade in new_grades:
        payment_to_lms[payment_id] = lms_grade.id

    return created, deactivated, payment_to_lms


async def _sync_subjects(db: SessionDep, payment_subjects: list[dict]) -> tuple[int, int, int]:
    """Upsert subjects by name and sync is_deleted status. Returns (created, updated, deactivated)."""
    existing = (await db.execute(select(Subject))).scalars().all()
    subject_map: dict[str, Subject] = {s.name: s for s in existing}
    pms_names: set[str] = set()

    created = updated = deactivated = 0
    for ps in payment_subjects:
        name = ps.get("name")
        if not name:
            continue
        pms_names.add(name)

        # Payment: is_deleted=True OR is_active=False → LMS: is_deleted=True
        should_delete = ps.get("is_deleted", False) or not ps.get("is_active", True)

        if name in subject_map:
            existing_subject = subject_map[name]
            if existing_subject.is_deleted != should_delete:
                existing_subject.is_deleted = should_delete
                updated += 1
        else:
            new_subject = Subject(name=name, is_deleted=should_delete)
            db.add(new_subject)
            subject_map[name] = new_subject
            created += 1

    # Soft-delete LMS subjects no longer present in PMS
    for name, subj in subject_map.items():
        if name not in pms_names and not subj.is_deleted:
            subj.is_deleted = True
            deactivated += 1

    await db.flush()
    return created, updated, deactivated


async def _sync_students(
    db: SessionDep,
    payment_students: list[dict],
    grade_map: dict[int, int],
    all_payment_document_ids: list[str] | None = None,
) -> tuple[int, int, int]:
    """Upsert students by document_id. Returns (created, updated, deactivated)."""
    existing_result = await db.execute(
        select(User).where(User.role == UserRole.STUDENT.value)
    )
    student_map: dict[str, User] = {s.document_id: s for s in existing_result.scalars().all()}

    sync_fields = [
        "first_name", "last_name", "middle_name", "birth_date", "gender",
        "phone_number", "student_id", "photo_url",
        "father_first_name", "father_last_name", "father_phone",
        "mother_first_name", "mother_last_name", "mother_phone",
        "address", "enrollment_date", "withdrawal_date",
        "is_active", "is_frozen", "frozen_at", "frozen_reason",
        "departure_date", "return_date", "is_deleted", "deleted_at",
    ]

    pms_base = settings.PAYMENT_API_URL.rstrip("/")

    created = updated = 0

    for ps in payment_students:
        # Make relative photo_url absolute so LMS frontend can load from PMS
        if ps.get("photo_url") and not ps["photo_url"].startswith("http"):
            ps["photo_url"] = f"{pms_base}{ps['photo_url']}"

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
            loop = asyncio.get_running_loop()
            student_data["hashed_password"] = await loop.run_in_executor(None, get_password_hash, doc_id)
            new_student = User(**student_data)
            db.add(new_student)
            student_map[doc_id] = new_student
            created += 1

    # Detect hard-deleted students (no longer in Payment)
    deactivated = 0
    if all_payment_document_ids is not None:
        active_ids = set(all_payment_document_ids)
        for doc_id, student in student_map.items():
            if doc_id not in active_ids and not student.is_deleted:
                student.is_deleted = True
                deactivated += 1

    return created, updated, deactivated


async def _sync_teachers(
    db: SessionDep,
    payment_teachers: list[dict],
    grade_map: dict[int, int],
    all_payment_document_ids: list[str] | None = None,
) -> tuple[int, int, int]:
    """Upsert teachers by document_id. Returns (created, updated, deactivated)."""
    existing_result = await db.execute(
        select(User).where(User.role == UserRole.TEACHER.value)
    )
    teacher_map: dict[str, User] = {t.document_id: t for t in existing_result.scalars().all()}

    sync_fields = [
        "first_name", "last_name", "middle_name", "birth_date", "gender",
        "phone_number", "photo_url", "is_active", "is_deleted", "subjects",
        "hashed_password",
    ]

    pms_base = settings.PAYMENT_API_URL.rstrip("/")

    created = updated = 0

    for pt in payment_teachers:
        # Make relative photo_url absolute so LMS frontend can load from PMS
        if pt.get("photo_url") and not pt["photo_url"].startswith("http"):
            pt["photo_url"] = f"{pms_base}{pt['photo_url']}"

        doc_id = pt.get("document_id")
        if not doc_id:
            continue

        payment_ct_grade_id = pt.get("class_teacher_grade_id")
        lms_ct_grade_id = grade_map.get(payment_ct_grade_id) if payment_ct_grade_id else None

        # Convert Payment teaching_grade_ids -> LMS teaching_grade_ids (map PMS IDs to LMS IDs)
        payment_teaching_ids = pt.get("teaching_grade_ids") or []
        lms_teaching_ids = [
            grade_map[gid]
            for gid in payment_teaching_ids
            if gid in grade_map
        ] or None

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
            if existing.teaching_grade_ids != lms_teaching_ids:
                existing.teaching_grade_ids = lms_teaching_ids
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
            teacher_data["teaching_grade_ids"] = lms_teaching_ids
            teacher_data["role"] = UserRole.TEACHER.value
            if not teacher_data.get("hashed_password"):
                loop = asyncio.get_running_loop()
                teacher_data["hashed_password"] = await loop.run_in_executor(None, get_password_hash, doc_id)
            new_teacher = User(**teacher_data)
            db.add(new_teacher)
            teacher_map[doc_id] = new_teacher
            created += 1

    # Detect hard-deleted teachers (no longer in Payment)
    deactivated = 0
    if all_payment_document_ids is not None:
        active_ids = set(all_payment_document_ids)
        for doc_id, teacher in teacher_map.items():
            if doc_id not in active_ids and not teacher.is_deleted:
                teacher.is_deleted = True
                deactivated += 1

    return created, updated, deactivated


async def _get_last_successful_sync(db: AsyncSession) -> datetime | None:
    """Get the timestamp of the last successful sync."""
    result = await db.execute(
        select(SyncLog.synced_at)
        .where(SyncLog.status == "success")
        .order_by(SyncLog.synced_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _save_sync_log(
    db: AsyncSession,
    *,
    status: str,
    stats: dict | None = None,
    error_message: str | None = None,
    triggered_by: str = "manual",
) -> None:
    """Save sync attempt to log."""
    log = SyncLog(status=status, stats=stats, error_message=error_message, triggered_by=triggered_by)
    db.add(log)
    await db.commit()


async def run_sync(db: AsyncSession, *, triggered_by: str = "manual") -> dict:
    """Core sync logic — reused by manual endpoint and auto-sync task."""
    last_sync = await _get_last_successful_sync(db)
    data = await _fetch_payment_data(updated_after=last_sync)

    academic_years_created, academic_years_updated, academic_years_deactivated = await _sync_academic_years(db, data.get("academic_years", []))
    grades_created, grades_deactivated, grade_map = await _sync_grades(db, data.get("grades", []))
    subjects_created, subjects_updated, subjects_deactivated = await _sync_subjects(db, data.get("subjects", []))
    students_created, students_updated, students_deactivated = await _sync_students(
        db, data.get("students", []), grade_map,
        all_payment_document_ids=data.get("all_student_document_ids"),
    )
    teachers_created, teachers_updated, teachers_deactivated = await _sync_teachers(
        db, data.get("teachers", []), grade_map,
        all_payment_document_ids=data.get("all_teacher_document_ids"),
    )

    await db.commit()

    result = {
        "message": "Sinxronizatsiya muvaffaqiyatli yakunlandi",
        "incremental": last_sync is not None,
        "updated_after": last_sync.isoformat() if last_sync else None,
        "academic_years_created": academic_years_created,
        "academic_years_updated": academic_years_updated,
        "academic_years_deactivated": academic_years_deactivated,
        "grades_created": grades_created,
        "grades_deactivated": grades_deactivated,
        "subjects_created": subjects_created,
        "subjects_updated": subjects_updated,
        "subjects_deactivated": subjects_deactivated,
        "students_created": students_created,
        "students_updated": students_updated,
        "students_deactivated": students_deactivated,
        "teachers_created": teachers_created,
        "teachers_updated": teachers_updated,
        "teachers_deactivated": teachers_deactivated,
        "total_students": len(data.get("students", [])),
        "total_teachers": len(data.get("teachers", [])),
    }

    await _save_sync_log(db, status="success", stats=result, triggered_by=triggered_by)

    logger.info(
        "Sync completed (%s, %s): academic_years=%d/%d/%d, grades=%d/%d, subjects=%d/%d, "
        "students=%d/%d/%d, teachers=%d/%d/%d",
        triggered_by,
        "incremental" if last_sync else "full",
        academic_years_created, academic_years_updated, academic_years_deactivated,
        grades_created, grades_deactivated, subjects_created, subjects_updated,
        students_created, students_updated, students_deactivated,
        teachers_created, teachers_updated, teachers_deactivated,
    )

    return result


@router.post("/all")
async def sync_from_payment(db: SessionDep, _current_user: SuperUser) -> dict:
    """Pull all shared data from Payment and upsert into LMS."""
    return await run_sync(db, triggered_by=f"manual:{_current_user.document_id}")


@router.get("/status")
async def sync_status(db: SessionDep, _current_user: SuperUser) -> dict:
    """Get last sync status and history."""
    result = await db.execute(
        select(SyncLog).order_by(SyncLog.synced_at.desc()).limit(5)
    )
    logs = result.scalars().all()

    return {
        "last_synced_at": logs[0].synced_at.isoformat() if logs else None,
        "last_status": logs[0].status if logs else None,
        "history": [
            {
                "synced_at": log.synced_at.isoformat(),
                "status": log.status,
                "triggered_by": log.triggered_by,
                "stats": log.stats,
                "error_message": log.error_message,
            }
            for log in logs
        ],
    }
