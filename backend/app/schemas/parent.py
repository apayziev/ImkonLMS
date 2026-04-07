"""Schemas for parent portal."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


# --- Auth ---

class ParentLoginRequest(BaseModel):
    phone: str = Field(min_length=9, max_length=20)
    password: str = Field(min_length=1)

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        return v.replace(" ", "").replace("-", "") if isinstance(v, str) else v


class ParentTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    parent: "ParentMeRead"


class ParentMeRead(BaseModel):
    phone: str
    name: str
    children: list["ParentChildRead"]


# --- Child ---

class ParentChildRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    full_name: str = ""
    photo_url: str | None = None
    grade_id: int | None = None
    grade_display: str | None = None
    is_active: bool = True
    is_frozen: bool = False


# --- Attendance ---

class ChildAttendanceRecord(BaseModel):
    date: str
    subject_name: str
    period_number: int
    start_time: str
    end_time: str
    status: str


class ChildAttendanceResponse(BaseModel):
    records: list[ChildAttendanceRecord]
    summary: "AttendanceSummary"


class AttendanceSummary(BaseModel):
    total: int = 0
    present: int = 0
    late: int = 0
    absent: int = 0


# --- Timetable ---

class ChildTimetableEntry(BaseModel):
    day_of_week: int
    period_number: int
    start_time: str
    end_time: str
    subject_name: str
    teacher_name: str
    room: str | None = None


class ChildTimetableResponse(BaseModel):
    entries: list[ChildTimetableEntry]


# --- Homework ---

class ChildHomeworkItem(BaseModel):
    subject_name: str
    topic: str | None = None
    homework: str
    homework_deadline: str | None = None
    plan_date: str
    teacher_name: str | None = None


class ChildHomeworkResponse(BaseModel):
    items: list[ChildHomeworkItem]


# --- Violations ---

class ChildViolationItem(BaseModel):
    violation_type: str
    points: int
    note: str | None = None
    location: str | None = None
    occurred_at: str
    reported_by: str


class ChildYellowCardItem(BaseModel):
    reason: str | None = None
    issued_by: str
    created_at: str


class ChildDisciplineResponse(BaseModel):
    violations: list[ChildViolationItem]
    yellow_cards: list[ChildYellowCardItem]
    total_violation_points: int = 0


# --- Admin parent management ---

class ParentCreate(BaseModel):
    phone: str = Field(min_length=9, max_length=20)
    password: str = Field(min_length=4)

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        return v.replace(" ", "").replace("-", "") if isinstance(v, str) else v


class ParentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str
    is_active: bool
    created_at: datetime
    children_count: int = 0


class ParentListResponse(BaseModel):
    data: list[ParentRead]
    count: int
