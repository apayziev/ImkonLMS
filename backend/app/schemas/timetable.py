from pydantic import BaseModel, ConfigDict, Field

from .base import TimestampSchema


# --- SchoolSettings ---


class SchoolSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lesson_duration_minutes: int | None = Field(default=None, ge=15, le=120)
    short_break_minutes: int | None = Field(default=None, ge=5, le=30)
    long_break_minutes: int | None = Field(default=None, ge=10, le=60)
    long_break_after_period: int | None = Field(default=None, ge=1, le=10)
    periods_per_day: int | None = Field(default=None, ge=1, le=12)
    working_days: list[int] | None = Field(default=None, min_length=1, max_length=7)
    break_names: dict[str, str] | None = None


class SchoolSettingsRead(TimestampSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_duration_minutes: int
    short_break_minutes: int
    long_break_minutes: int
    long_break_after_period: int
    periods_per_day: int
    working_days: list[int]
    break_names: dict[str, str]


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
