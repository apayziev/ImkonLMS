from pydantic import BaseModel, ConfigDict, Field

from .base import TimestampSchema


# --- SchoolSettings ---


class BreakItem(BaseModel):
    start_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    name: str = ""


class SchoolSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day_start_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    day_end_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    lesson_duration_minutes: int | None = Field(default=None, ge=15, le=120)
    default_break_minutes: int | None = Field(default=None, ge=1, le=30)
    working_days: list[int] | None = Field(default=None, min_length=1, max_length=7)
    breaks: list[BreakItem] | None = None


class SchoolSettingsRead(TimestampSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_start_time: str
    day_end_time: str
    lesson_duration_minutes: int
    default_break_minutes: int
    working_days: list[int]
    breaks: list[BreakItem]


# --- TimeSlot ---


class TimeSlotCreate(BaseModel):
    academic_year_id: int
    period_number: int = Field(ge=1, le=12)
    start_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(pattern=r"^\d{2}:\d{2}$")




class TimeSlotRead(TimestampSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    academic_year_id: int
    period_number: int
    start_time: str
    end_time: str


class TimeSlotList(BaseModel):
    data: list[TimeSlotRead]
    count: int


# --- ScheduleEntry ---


class ScheduleEntryCreate(BaseModel):
    academic_year_id: int
    grade_id: int
    subject_id: int
    teacher_id: int
    time_slot_id: int
    day_of_week: int = Field(ge=1, le=7)


class ScheduleEntryUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject_id: int | None = None
    teacher_id: int | None = None


class ScheduleEntryRead(TimestampSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    academic_year_id: int
    grade_id: int
    subject_id: int
    teacher_id: int
    time_slot_id: int
    day_of_week: int

    # Nested read-only display fields (populated via relationship)
    subject_name: str | None = None
    teacher_name: str | None = None
    grade_display: str | None = None
    period_number: int | None = None
    start_time: str | None = None
    end_time: str | None = None


class ScheduleEntryList(BaseModel):
    data: list[ScheduleEntryRead]
    count: int
