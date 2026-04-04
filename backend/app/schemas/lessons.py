"""Lesson session & attendance schemas."""

from datetime import date

from pydantic import BaseModel, ConfigDict

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
    room: str | None = None

    # Session info (None if not started)
    session_id: int | None = None
    session_status: SessionStatus | None = None
    has_plan_content: bool = False
    plan_filled_count: int = 0  # 0-6: topic, lesson_type, objectives, keywords, homework, materials


class TodayLessonsResponse(BaseModel):
    data: list[TodayLessonRead]
    date: str


class SessionStatusItem(BaseModel):
    schedule_entry_id: int
    session_date: str
    status: SessionStatus


class SessionStatusesResponse(BaseModel):
    data: list[SessionStatusItem]


# --- Session ---


class SessionStartRequest(BaseModel):
    schedule_entry_id: int
    target_date: date | None = None  # If None, defaults to today


class SessionStudentRead(BaseModel):
    """One student's attendance in a session."""

    model_config = ConfigDict(from_attributes=True)

    attendance_id: int
    student_id: int
    first_name: str
    last_name: str
    full_name: str
    photo_url: str | None = None
    status: AttendanceStatus
    marked_at: str | None = None


class LessonMaterialRead(BaseModel):
    id: int
    file_url: str
    original_name: str
    file_size: int


class SessionDetailRead(BaseModel):
    id: int
    schedule_entry_id: int
    session_date: str
    started_at: str | None = None
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
    lesson_type: str | None = None
    objectives: list[str] | None = None
    keywords: list[str] | None = None

    students: list[SessionStudentRead]
    materials: list[LessonMaterialRead] = []


# --- Attendance update ---


class SessionUpdateRequest(BaseModel):
    topic: str | None = None
    homework: str | None = None
    homework_deadline: str | None = None
    lesson_type: str | None = None
    objectives: list[str] | None = None
    keywords: list[str] | None = None


class AttendanceUpdateRequest(BaseModel):
    student_id: int
    status: AttendanceStatus


# --- Admin Attendance View ---


class AttendanceStudentRead(BaseModel):
    student_id: int
    full_name: str
    photo_url: str | None = None
    status: AttendanceStatus
    marked_at: str | None = None


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


# --- Attendance History (teacher: student × date matrix) ---


class AttendanceHistoryRecord(BaseModel):
    date: str
    status: AttendanceStatus


class AttendanceHistoryStudent(BaseModel):
    student_id: int
    full_name: str
    photo_url: str | None = None
    records: dict[str, AttendanceStatus]  # date → status


class AttendanceHistoryResponse(BaseModel):
    dates: list[str]
    students: list[AttendanceHistoryStudent]
