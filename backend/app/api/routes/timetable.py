"""Timetable routes — school settings, time slots, schedule entries."""

from datetime import time
from typing import Any

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, SuperUser
from app.core.exceptions import DuplicateValueException, NotFoundException
from app.crud.timetable import crud_schedule_entries, crud_school_settings, crud_time_slots
from app.models.schedule_entry import ScheduleEntry
from app.models.school_settings import SchoolSettings
from app.models.time_slot import TimeSlot
from app.schemas.timetable import (
    ScheduleEntryCreate,
    ScheduleEntryList,
    ScheduleEntryRead,
    ScheduleEntryUpdate,
    SchoolSettingsRead,
    SchoolSettingsUpdate,
    TimeSlotCreate,
    TimeSlotGenerate,
    TimeSlotList,
    TimeSlotRead,
)

router = APIRouter(prefix="/timetable", tags=["timetable"])

SETTINGS_KEY = "default"


# ─── Helpers ────────────────────────────────────────────────────────────────


def _parse_time(value: str) -> time:
    h, m = value.split(":")
    return time(int(h), int(m))


def _format_time(t: time) -> str:
    return t.strftime("%H:%M")


async def _get_or_create_settings(db: AsyncSession) -> SchoolSettings:
    settings = await crud_school_settings.get(db, key=SETTINGS_KEY, is_deleted=False)
    if not settings:
        settings = SchoolSettings(key=SETTINGS_KEY)
        db.add(settings)
        await db.flush()
    return settings


def _entry_to_read(entry: ScheduleEntry) -> ScheduleEntryRead:
    return ScheduleEntryRead(
        id=entry.id,
        academic_year_id=entry.academic_year_id,
        grade_id=entry.grade_id,
        subject_id=entry.subject_id,
        teacher_id=entry.teacher_id,
        time_slot_id=entry.time_slot_id,
        day_of_week=entry.day_of_week,
        subject_name=entry.subject.name if entry.subject else None,
        teacher_name=entry.teacher.full_name if entry.teacher else None,
        grade_display=entry.grade.display_name if entry.grade else None,
        period_number=entry.time_slot.period_number if entry.time_slot else None,
        start_time=_format_time(entry.time_slot.start_time) if entry.time_slot else None,
        end_time=_format_time(entry.time_slot.end_time) if entry.time_slot else None,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


# ─── School Settings ───────────────────────────────────────────────────────


@router.get("/settings", response_model=SchoolSettingsRead)
async def get_school_settings(db: SessionDep) -> Any:
    return await _get_or_create_settings(db)


@router.patch("/settings", response_model=SchoolSettingsRead)
async def update_school_settings(
    body: SchoolSettingsUpdate, db: SessionDep, admin: SuperUser,
) -> Any:
    settings = await _get_or_create_settings(db)
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        return settings
    return await crud_school_settings.update(db, settings, update_data)


# ─── Time Slots ─────────────────────────────────────────────────────────────


@router.get("/time-slots", response_model=TimeSlotList)
async def list_time_slots(db: SessionDep, academic_year_id: int) -> Any:
    result = await crud_time_slots.get_multi(
        db, academic_year_id=academic_year_id, is_deleted=False, limit=20,
    )
    slots = result["data"]
    return TimeSlotList(
        data=[
            TimeSlotRead(
                id=s.id,
                academic_year_id=s.academic_year_id,
                period_number=s.period_number,
                start_time=_format_time(s.start_time),
                end_time=_format_time(s.end_time),
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
            for s in slots
        ],
        count=result["total_count"],
    )


@router.post("/time-slots", response_model=TimeSlotRead, status_code=201)
async def create_time_slot(body: TimeSlotCreate, db: SessionDep, admin: SuperUser) -> Any:
    existing = await crud_time_slots.get(
        db, academic_year_id=body.academic_year_id, period_number=body.period_number, is_deleted=False,
    )
    if existing:
        raise DuplicateValueException(f"{body.period_number}-dars uchun vaqt allaqachon mavjud")

    slot = TimeSlot(
        academic_year_id=body.academic_year_id,
        period_number=body.period_number,
        start_time=_parse_time(body.start_time),
        end_time=_parse_time(body.end_time),
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return TimeSlotRead(
        id=slot.id,
        academic_year_id=slot.academic_year_id,
        period_number=slot.period_number,
        start_time=_format_time(slot.start_time),
        end_time=_format_time(slot.end_time),
        created_at=slot.created_at,
        updated_at=slot.updated_at,
    )


@router.delete("/time-slots/{slot_id}", status_code=204)
async def delete_time_slot(slot_id: int, db: SessionDep, admin: SuperUser) -> None:
    deleted = await crud_time_slots.delete(db, id=slot_id, is_deleted=False)
    if not deleted:
        raise NotFoundException("Dars vaqti topilmadi")


@router.post("/time-slots/generate", response_model=TimeSlotList, status_code=201)
async def generate_time_slots(
    body: TimeSlotGenerate, db: SessionDep, admin: SuperUser,
) -> Any:
    """Auto-generate time slots from school settings."""
    settings = await _get_or_create_settings(db)

    # Soft-delete existing time slots for this academic year
    existing = await crud_time_slots.get_multi(
        db, academic_year_id=body.academic_year_id, is_deleted=False, limit=20,
    )
    for slot in existing["data"]:
        await crud_time_slots.delete(db, id=slot.id, is_deleted=False)

    # Calculate new time slots
    h, m = (int(x) for x in body.start_time.split(":"))
    current = h * 60 + m
    slots: list[TimeSlot] = []

    for period in range(1, settings.periods_per_day + 1):
        sh, sm = divmod(current, 60)
        end = current + settings.lesson_duration_minutes
        eh, em = divmod(end, 60)

        slot = TimeSlot(
            academic_year_id=body.academic_year_id,
            period_number=period,
            start_time=time(sh, sm),
            end_time=time(eh, em),
        )
        db.add(slot)
        slots.append(slot)

        if period == settings.long_break_after_period:
            current = end + settings.long_break_minutes
        else:
            current = end + settings.short_break_minutes

    await db.commit()
    for s in slots:
        await db.refresh(s)

    return TimeSlotList(
        data=[
            TimeSlotRead(
                id=s.id,
                academic_year_id=s.academic_year_id,
                period_number=s.period_number,
                start_time=_format_time(s.start_time),
                end_time=_format_time(s.end_time),
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
            for s in slots
        ],
        count=len(slots),
    )


# ─── Schedule Entries ────────────────────────────────────────────────────────


SCHEDULE_LOAD_OPTIONS = [
    selectinload(ScheduleEntry.subject),
    selectinload(ScheduleEntry.teacher),
    selectinload(ScheduleEntry.grade),
    selectinload(ScheduleEntry.time_slot),
]


@router.get("/schedule", response_model=ScheduleEntryList)
async def list_schedule(
    db: SessionDep,
    academic_year_id: int,
    grade_id: int | None = None,
    teacher_id: int | None = None,
) -> Any:
    filters: dict[str, Any] = {"academic_year_id": academic_year_id, "is_deleted": False}
    if grade_id is not None:
        filters["grade_id"] = grade_id
    if teacher_id is not None:
        filters["teacher_id"] = teacher_id

    result = await crud_schedule_entries.get_multi(
        db, options=SCHEDULE_LOAD_OPTIONS, limit=500, **filters,
    )
    return ScheduleEntryList(
        data=[_entry_to_read(e) for e in result["data"]],
        count=result["total_count"],
    )


@router.post("/schedule", response_model=ScheduleEntryRead, status_code=201)
async def create_schedule_entry(
    body: ScheduleEntryCreate, db: SessionDep, admin: SuperUser,
) -> Any:
    entry = ScheduleEntry(
        academic_year_id=body.academic_year_id,
        grade_id=body.grade_id,
        subject_id=body.subject_id,
        teacher_id=body.teacher_id,
        time_slot_id=body.time_slot_id,
        day_of_week=body.day_of_week,
    )
    db.add(entry)
    try:
        await db.flush()
    except Exception as exc:
        await db.rollback()
        raise DuplicateValueException("Bu vaqtda sinf yoki o'qituvchi band") from exc

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(ScheduleEntry)
        .where(ScheduleEntry.id == entry.id)
        .options(*SCHEDULE_LOAD_OPTIONS)
    )
    entry = result.scalar_one()
    return _entry_to_read(entry)


@router.patch("/schedule/{entry_id}", response_model=ScheduleEntryRead)
async def update_schedule_entry(
    entry_id: int, body: ScheduleEntryUpdate, db: SessionDep, admin: SuperUser,
) -> Any:
    entry = await crud_schedule_entries.get(db, id=entry_id, is_deleted=False)
    if not entry:
        raise NotFoundException("Dars jadvali yozuvi topilmadi")

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        # Reload with relations for response
        result = await db.execute(
            select(ScheduleEntry)
            .where(ScheduleEntry.id == entry.id)
            .options(*SCHEDULE_LOAD_OPTIONS)
        )
        return _entry_to_read(result.scalar_one())

    for field, value in update_data.items():
        setattr(entry, field, value)

    try:
        await db.flush()
    except Exception as exc:
        await db.rollback()
        raise DuplicateValueException("Bu vaqtda sinf yoki o'qituvchi band") from exc

    await db.commit()

    result = await db.execute(
        select(ScheduleEntry)
        .where(ScheduleEntry.id == entry.id)
        .options(*SCHEDULE_LOAD_OPTIONS)
    )
    return _entry_to_read(result.scalar_one())


@router.delete("/schedule/{entry_id}", status_code=204)
async def delete_schedule_entry(entry_id: int, db: SessionDep, admin: SuperUser) -> None:
    deleted = await crud_schedule_entries.delete(db, id=entry_id, is_deleted=False)
    if not deleted:
        raise NotFoundException("Dars jadvali yozuvi topilmadi")
