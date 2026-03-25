"""Lesson session & attendance schemas."""

from pydantic import BaseModel, ConfigDict, Field


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
    session_status: str | None = None  # in_progress | completed


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
    status: str  # unmarked | present | excused | unexcused
    marked_at: str | None = None
    grade: int | None = None


class SessionDetailRead(BaseModel):
    id: int
    schedule_entry_id: int
    session_date: str
    started_at: str
    ended_at: str | None = None
    status: str

    grade_display: str
    subject_name: str
    period_number: int
    start_time: str
    end_time: str
    teacher_name: str

    students: list[SessionStudentRead]


# --- Attendance update ---


class AttendanceUpdateRequest(BaseModel):
    student_id: int
    status: str = Field(pattern=r"^(unmarked|present|excused|unexcused)$")
    grade: int | None = Field(default=None, ge=1, le=5)


# --- Admin Attendance View ---


class AttendanceStudentRead(BaseModel):
    student_id: int
    full_name: str
    photo_url: str | None = None
    status: str  # unmarked | present | excused | unexcused
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
    status: str  # in_progress | completed
    students: list[AttendanceStudentRead]


class AttendanceDayResponse(BaseModel):
    date: str
    grade_display: str
    sessions: list[AttendanceSessionRead]
