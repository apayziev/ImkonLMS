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


def _generate_slots(
    day_start: str,
    day_end: str,
    lesson_dur: int,
    default_break: int,
    breaks: list[dict],
) -> list[dict]:
    """Calculate time slots from settings. Returns list of {period_number, start_time, end_time}.

    Breaks are time-based: [{start_time, end_time, name}].
    Algorithm: fill lessons sequentially; when a lesson would overlap a break,
    end the lesson before the break and resume after the break.
    """
    # Parse breaks into sorted list of (start_min, end_min, name)
    parsed_breaks = []
    for b in breaks:
        sh, sm = map(int, b["start_time"].split(":"))
        eh, em = map(int, b["end_time"].split(":"))
        parsed_breaks.append((sh * 60 + sm, eh * 60 + em, b.get("name", "")))
    parsed_breaks.sort(key=lambda x: x[0])

    start_h, start_m = map(int, day_start.split(":"))
    end_h, end_m = map(int, day_end.split(":"))
    cursor = start_h * 60 + start_m
    day_end_min = end_h * 60 + end_m

    result = []
    period = 1

    while cursor + lesson_dur <= day_end_min:
        # Skip any breaks that start at or before cursor
        skipped = False
        for bs, be, _ in parsed_breaks:
            if bs <= cursor < be:
                cursor = be
                skipped = True
                break
        if skipped:
            continue

        slot_start = cursor
        slot_end = cursor + lesson_dur

        # Check if this lesson overlaps a break
        overlaps_break = False
        for bs, be, _ in parsed_breaks:
            if slot_start < bs < slot_end:
                # Lesson would run into a break — end before break
                slot_end = bs
                overlaps_break = True
                break

        if slot_end - slot_start < 10:
            cursor = slot_end
            continue

        result.append({
            "period_number": period,
            "start_time": f"{slot_start // 60:02d}:{slot_start % 60:02d}",
            "end_time": f"{slot_end // 60:02d}:{slot_end % 60:02d}",
        })

        cursor = slot_end + (0 if overlaps_break else default_break)
        period += 1

    return result


@router.post("/time-slots/generate", response_model=TimeSlotList)
async def generate_time_slots(
    db: SessionDep,
    admin: SuperUser,
    academic_year_id: int,
) -> Any:
    """Generate time slots from school settings. Replaces existing slots."""
    settings = await _get_or_create_settings(db)

    slots_data = _generate_slots(
        day_start=settings.day_start_time,
        day_end=settings.day_end_time,
        lesson_dur=settings.lesson_duration_minutes,
        default_break=settings.default_break_minutes,
        breaks=settings.breaks or [],
    )

    if not slots_data:
        return TimeSlotList(data=[], count=0)

    # Soft-delete existing slots for this academic year
    existing = await crud_time_slots.get_multi(
        db, academic_year_id=academic_year_id, is_deleted=False, limit=50,
    )
    for slot in existing["data"]:
        await crud_time_slots.delete(db, id=slot.id, is_deleted=False)

    # Create new slots
    created = []
    for s in slots_data:
        slot = TimeSlot(
            academic_year_id=academic_year_id,
            period_number=s["period_number"],
            start_time=_parse_time(s["start_time"]),
            end_time=_parse_time(s["end_time"]),
        )
        db.add(slot)
        created.append(slot)

    await db.commit()
    for slot in created:
        await db.refresh(slot)

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
            for s in created
        ],
        count=len(created),
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
