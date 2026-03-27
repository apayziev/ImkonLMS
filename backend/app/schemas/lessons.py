"""Lesson session & attendance schemas."""

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import AttendanceStatus, SessionStatus

# --- Today's Lesson (schedule-based) ---


class TodayLessonRead(BaseModel):
    """A single scheduled lesson for today, enriched with session status."""

    schedule_entry_id: int
    grade_id: int
    grade_display: str
    subject_id: int
    subject_name: str
    period_number: int
    start_time: str
    end_time: str

    # Session info (None if not started)
    session_id: int | None = None
    session_status: SessionStatus | None = None


class TodayLessonsResponse(BaseModel):
    data: list[TodayLessonRead]
    date: str


# --- Session ---


class SessionStartRequest(BaseModel):
    schedule_entry_id: int


class SessionStudentRead(BaseModel):
    """One student's attendance + grade in a session."""

    model_config = ConfigDict(from_attributes=True)

    attendance_id: int
    student_id: int
    first_name: str
    last_name: str
    full_name: str
    photo_url: str | None = None
    status: AttendanceStatus
    marked_at: str | None = None
    grade: int | None = None


class LessonMaterialRead(BaseModel):
    id: int
    file_url: str
    original_name: str
    file_size: int


class SessionDetailRead(BaseModel):
    id: int
    schedule_entry_id: int
    session_date: str
    started_at: str
    ended_at: str | None = None
    status: SessionStatus

    grade_display: str
    subject_name: str
    period_number: int
    start_time: str
    end_time: str
    teacher_name: str

    topic: str | None = None
    homework: str | None = None
    homework_deadline: str | None = None

    students: list[SessionStudentRead]
    materials: list[LessonMaterialRead] = []


# --- Attendance update ---


class SessionUpdateRequest(BaseModel):
    topic: str | None = None
    homework: str | None = None
    homework_deadline: str | None = None


class AttendanceUpdateRequest(BaseModel):
    student_id: int
    status: AttendanceStatus
    grade: int | None = Field(default=None, ge=1, le=5)


# --- Admin Attendance View ---


class AttendanceStudentRead(BaseModel):
    student_id: int
    full_name: str
    photo_url: str | None = None
    status: AttendanceStatus
    marked_at: str | None = None
    grade: int | None = None


class AttendanceSessionRead(BaseModel):
    session_id: int
    subject_name: str
    period_number: int
    start_time: str
    end_time: str
    started_at: str
    ended_at: str | None = None
    teacher_name: str
    status: SessionStatus
    students: list[AttendanceStudentRead]


class AttendanceDayResponse(BaseModel):
    date: str
    grade_display: str
    sessions: list[AttendanceSessionRead]
