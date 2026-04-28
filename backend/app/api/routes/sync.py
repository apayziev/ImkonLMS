"""Sync all shared data from Payment system (single source of truth)."""

import asyncio
import logging
from collections.abc import Callable
from datetime import date, datetime

import httpx
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SessionDep, SuperUser
from app.core.config import settings
from app.core.logging_utils import mask_document_id
from app.core.security import get_password_hash
from app.models.academic_year import AcademicYear
from app.models.grade import Grade
from app.models.parent_auth import ParentAuth
from app.models.subject import Subject
from app.models.sync_log import SyncLog
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sync", tags=["sync"])

SYNC_TIMEOUT = 30.0

# Fields that need date string -> date object conversion
_DATE_FIELDS = {
    "birth_date",
    "enrollment_date",
    "withdrawal_date",
    "frozen_at",
    "departure_date",
    "return_date",
    "deleted_at",
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


async def _sync_academic_years(
    db: SessionDep, payment_years: list[dict]
) -> tuple[int, int, int]:
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
            for field in (
                "start_year",
                "end_year",
                "start_month",
                "end_month",
                "is_current",
            ):
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


async def _sync_grades(
    db: SessionDep, payment_grades: list[dict]
) -> tuple[int, int, dict[int, int]]:
    """Upsert grades and return (created_count, deactivated_count, payment_id_to_lms_id_map)."""
    existing = (await db.execute(select(Grade))).scalars().all()
    grade_map: dict[tuple[int, str], Grade] = {
        (g.level, g.section): g for g in existing
    }

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


async def _sync_subjects(
    db: SessionDep, payment_subjects: list[dict]
) -> tuple[int, int, int]:
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


def _make_photo_url_absolute(record: dict, pms_base: str) -> None:
    """Convert relative photo_url to absolute URL."""
    if record.get("photo_url") and not record["photo_url"].startswith("http"):
        record["photo_url"] = f"{pms_base}{record['photo_url']}"


def _build_field_value(field: str, value: object) -> object:
    """Parse date fields, pass others through."""
    return _parse_date(value) if field in _DATE_FIELDS else value


async def _sync_users(
    db: SessionDep,
    role: UserRole,
    payment_users: list[dict],
    grade_map: dict[int, int],
    sync_fields: list[str],
    *,
    extra_fields_fn: Callable[[dict, dict], dict] | None = None,
    all_payment_document_ids: list[str] | None = None,
    allowed_roles: list[UserRole] | None = None,
) -> tuple[int, int, int, list[str]]:
    """Generic user sync. Returns (created, updated, deactivated, errors).

    extra_fields_fn(record, grade_map) -> dict of additional fields for create/update.
    allowed_roles: if set, sync role from PMS when it's one of these values.
    """
    query_roles = [r.value for r in allowed_roles] if allowed_roles else [role.value]
    existing_result = await db.execute(select(User).where(User.role.in_(query_roles)))
    user_map: dict[str, User] = {
        u.document_id: u for u in existing_result.scalars().all()
    }

    pms_base = settings.PAYMENT_API_URL.rstrip("/")
    created = updated = 0
    errors: list[str] = []

    for record in payment_users:
        doc_id = record.get("document_id")
        if not doc_id:
            continue

        try:
            _make_photo_url_absolute(record, pms_base)
            extra = extra_fields_fn(record, grade_map) if extra_fields_fn else {}
            existing = user_map.get(doc_id)

            if existing:
                changed = False
                for field in sync_fields:
                    if field in record:
                        new_val = _build_field_value(field, record[field])
                        if getattr(existing, field, None) != new_val:
                            setattr(existing, field, new_val)
                            changed = True
                for field, val in extra.items():
                    if getattr(existing, field, None) != val:
                        setattr(existing, field, val)
                        changed = True
                # Sync role from PMS when allowed
                if allowed_roles:
                    pms_role = record.get("role", role.value)
                    if pms_role in query_roles and existing.role != pms_role:
                        existing.role = pms_role
                        changed = True
                if changed:
                    updated += 1
            else:
                user_data: dict = {}
                for f in sync_fields:
                    if f in record:
                        user_data[f] = _build_field_value(f, record[f])
                user_data.update(extra)
                user_data["document_id"] = doc_id
                # Use PMS role when allowed, otherwise default
                if allowed_roles:
                    pms_role = record.get("role", role.value)
                    user_data["role"] = pms_role if pms_role in query_roles else role.value
                else:
                    user_data["role"] = role.value
                if not user_data.get("hashed_password"):
                    if role == UserRole.STUDENT:
                        # Students authenticate passwordless via document_id;
                        # skip the (slow) bcrypt entirely. ~100 ms per student
                        # × thousands at first sync = minutes saved.
                        user_data["hashed_password"] = None
                    else:
                        loop = asyncio.get_running_loop()
                        user_data["hashed_password"] = await loop.run_in_executor(
                            None,
                            get_password_hash,
                            doc_id,
                        )
                new_user = User(**user_data)
                db.add(new_user)
                user_map[doc_id] = new_user
                created += 1
        except Exception as e:
            logger.warning("Sync %s failed for %s: %s", role.value, mask_document_id(doc_id), e)
            errors.append(f"{doc_id}: {e}")

    # Detect hard-deleted users (no longer in Payment)
    deactivated = 0
    if all_payment_document_ids is not None:
        active_ids = set(all_payment_document_ids)
        for doc_id, user in user_map.items():
            if doc_id not in active_ids and not user.is_deleted:
                user.is_deleted = True
                deactivated += 1

    return created, updated, deactivated, errors


# ── Role-specific sync field configs ────────────────────────────────────────

_STUDENT_SYNC_FIELDS = [
    "first_name",
    "last_name",
    "middle_name",
    "birth_date",
    "gender",
    "phone_number",
    "student_id",
    "photo_url",
    "father_first_name",
    "father_last_name",
    "father_phone",
    "mother_first_name",
    "mother_last_name",
    "mother_phone",
    "address",
    "enrollment_date",
    "withdrawal_date",
    "is_active",
    "is_frozen",
    "frozen_at",
    "frozen_reason",
    "departure_date",
    "return_date",
    "is_deleted",
    "deleted_at",
]

_TEACHER_SYNC_FIELDS = [
    "first_name",
    "last_name",
    "middle_name",
    "birth_date",
    "gender",
    "phone_number",
    "photo_url",
    "is_active",
    "is_deleted",
    "subjects",
    "hashed_password",
]


def _student_extra_fields(record: dict, grade_map: dict[int, int]) -> dict:
    """Compute student-specific fields (grade_id)."""
    lms_grade_id = (
        grade_map.get(record.get("grade_id")) if record.get("grade_id") else None
    )
    return {"grade_id": lms_grade_id}


def _teacher_extra_fields(record: dict, grade_map: dict[int, int]) -> dict:
    """Compute teacher-specific fields (class_teacher_grade_id, teaching_grade_ids)."""
    payment_ct = record.get("class_teacher_grade_id")
    lms_ct = grade_map.get(payment_ct) if payment_ct else None

    payment_teaching = record.get("teaching_grade_ids") or []
    lms_teaching = [
        grade_map[gid] for gid in payment_teaching if gid in grade_map
    ] or None

    return {"class_teacher_grade_id": lms_ct, "teaching_grade_ids": lms_teaching}


async def _sync_students(
    db: SessionDep,
    payment_students: list[dict],
    grade_map: dict[int, int],
    all_payment_document_ids: list[str] | None = None,
) -> tuple[int, int, int, list[str]]:
    """Upsert students by document_id. Returns (created, updated, deactivated, errors)."""
    return await _sync_users(
        db,
        UserRole.STUDENT,
        payment_students,
        grade_map,
        _STUDENT_SYNC_FIELDS,
        extra_fields_fn=_student_extra_fields,
        all_payment_document_ids=all_payment_document_ids,
    )


async def _sync_teachers(
    db: SessionDep,
    payment_teachers: list[dict],
    grade_map: dict[int, int],
    all_payment_document_ids: list[str] | None = None,
) -> tuple[int, int, int, list[str]]:
    """Upsert teachers by document_id. Returns (created, updated, deactivated, errors)."""
    return await _sync_users(
        db,
        UserRole.TEACHER,
        payment_teachers,
        grade_map,
        _TEACHER_SYNC_FIELDS,
        extra_fields_fn=_teacher_extra_fields,
        all_payment_document_ids=all_payment_document_ids,
        allowed_roles=[UserRole.TEACHER, UserRole.ACADEMIC_HEAD],
    )


async def _sync_parent_auth(db: AsyncSession) -> tuple[int, int]:
    """Auto-create ParentAuth for father/mother phones from DB students.

    Password = student's document_id (fallback: last 4 digits of phone).
    Returns (created, skipped).
    """
    # Get existing parent phones
    result = await db.execute(select(ParentAuth.phone))
    existing_phones: set[str] = {row[0] for row in result.all()}

    # Get all active students with parent phones from LMS DB
    students = (
        await db.execute(
            select(User.document_id, User.father_phone, User.mother_phone)
            .where(
                User.role == "student",
                User.is_active == True,  # noqa: E712
                User.is_deleted == False,  # noqa: E712
            )
            .where((User.father_phone.isnot(None)) | (User.mother_phone.isnot(None)))
        )
    ).all()

    created = 0
    loop = asyncio.get_running_loop()

    for doc_id, father_phone, mother_phone in students:
        for phone in (father_phone, mother_phone):
            if not phone or phone in existing_phones:
                continue

            password = doc_id if doc_id else phone[-4:]
            hashed = await loop.run_in_executor(None, get_password_hash, password)

            db.add(
                ParentAuth(
                    phone=phone,
                    hashed_password=hashed,
                    is_active=True,
                )
            )
            existing_phones.add(phone)
            created += 1

    return created, len(students) * 2 - created


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
    log = SyncLog(
        status=status,
        stats=stats,
        error_message=error_message,
        triggered_by=triggered_by,
    )
    db.add(log)
    await db.commit()


async def run_sync(db: AsyncSession, *, triggered_by: str = "manual") -> dict:
    """Core sync logic — reused by manual endpoint and auto-sync task."""
    last_sync = await _get_last_successful_sync(db)
    data = await _fetch_payment_data(updated_after=last_sync)

    academic_years_created, academic_years_updated, academic_years_deactivated = (
        await _sync_academic_years(db, data.get("academic_years", []))
    )
    grades_created, grades_deactivated, grade_map = await _sync_grades(
        db, data.get("grades", [])
    )
    subjects_created, subjects_updated, subjects_deactivated = await _sync_subjects(
        db, data.get("subjects", [])
    )
    students_created, students_updated, students_deactivated, student_errors = (
        await _sync_students(
            db,
            data.get("students", []),
            grade_map,
            all_payment_document_ids=data.get("all_student_document_ids"),
        )
    )
    teachers_created, teachers_updated, teachers_deactivated, teacher_errors = (
        await _sync_teachers(
            db,
            data.get("teachers", []),
            grade_map,
            all_payment_document_ids=data.get("all_teacher_document_ids"),
        )
    )

    parents_created, _ = await _sync_parent_auth(db)

    await db.commit()

    all_errors = student_errors + teacher_errors
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
        "parents_created": parents_created,
        "errors": all_errors[:50] if all_errors else [],
    }

    log_status = "partial" if all_errors else "success"
    await _save_sync_log(db, status=log_status, stats=result, triggered_by=triggered_by)

    if all_errors:
        logger.warning("Sync completed with %d error(s)", len(all_errors))

    logger.info(
        "Sync completed (%s, %s): academic_years=%d/%d/%d, grades=%d/%d, subjects=%d/%d, "
        "students=%d/%d/%d, teachers=%d/%d/%d",
        triggered_by,
        "incremental" if last_sync else "full",
        academic_years_created,
        academic_years_updated,
        academic_years_deactivated,
        grades_created,
        grades_deactivated,
        subjects_created,
        subjects_updated,
        students_created,
        students_updated,
        students_deactivated,
        teachers_created,
        teachers_updated,
        teachers_deactivated,
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
