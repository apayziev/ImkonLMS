"""Lesson plan, session & attendance schemas."""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import AttendanceStatus, SessionStatus

# --- Today's Lesson (schedule-based) ---


class TodayLessonRead(BaseModel):
    """A single scheduled lesson for today, enriched with session/plan status."""

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

    # Plan info
    plan_id: int | None = None
    plan_filled_count: int = 0

    # Lesson number in quarter
    lesson_number: int = 0
    total_lessons: int = 0


class TodayLessonsResponse(BaseModel):
    data: list[TodayLessonRead]
    date: str


class SessionStatusItem(BaseModel):
    schedule_entry_id: int
    session_date: str
    status: SessionStatus


class SessionStatusesResponse(BaseModel):
    data: list[SessionStatusItem]


# --- Lesson Plan ---


class LessonPlanObjectiveRead(BaseModel):
    text: str
    bloom_level: str | None = None  # biladi | tushunadi | tahlil


class LessonPlanStageRead(BaseModel):
    title: str
    duration_min: int
    activity: str


class LessonPlanRead(BaseModel):
    id: int
    schedule_entry_id: int | None
    plan_date: str
    topic: str | None = None
    lesson_type: str | None = None
    objectives: list[LessonPlanObjectiveRead] | None = None
    keywords: list[str] | None = None
    homework: str | None = None
    homework_deadline: str | None = None
    stages: list[LessonPlanStageRead] | None = None
    resources: list[str] | None = None
    assessment_methods: list[str] | None = None
    homework_test_id: int | None = None
    homework_test_title: str | None = None
    materials: list["LessonMaterialRead"] = []
    plan_filled_count: int = 0


class LessonPlanCreateRequest(BaseModel):
    schedule_entry_id: int
    target_date: date | None = None


class LessonPlanUpdateRequest(BaseModel):
    topic: str | None = None
    homework: str | None = None
    homework_deadline: str | None = None
    lesson_type: str | None = None
    objectives: list[LessonPlanObjectiveRead] | None = None
    keywords: list[str] | None = None
    stages: list[LessonPlanStageRead] | None = None
    resources: list[str] | None = None
    assessment_methods: list[str] | None = None
    homework_test_id: int | None = None
    homework_test_title: str | None = None


# --- Session ---


class SessionStartRequest(BaseModel):
    schedule_entry_id: int
    target_date: date | None = None  # If None, defaults to today


class SessionStudentAssessment(BaseModel):
    """Daily BQM scores for one student in a session.

    Each dimension is independently optional — partial assessments are allowed
    when the student demonstrated only some skills in class.
    """

    knowing: int | None = None  # 0–4
    applying: int | None = None  # 0–4
    reasoning: int | None = None  # 0–2


class SessionStudentRead(BaseModel):
    """One student's attendance + assessment in a session."""

    model_config = ConfigDict(from_attributes=True)

    attendance_id: int
    student_id: int
    first_name: str
    last_name: str
    full_name: str
    photo_url: str | None = None
    status: AttendanceStatus
    marked_at: str | None = None
    assessment: SessionStudentAssessment = SessionStudentAssessment()


class AssessmentUpdateRequest(BaseModel):
    """Patch one dimension at a time, or several together. Each is optional."""

    student_id: int
    knowing: int | None = Field(default=None, ge=1, le=4)
    applying: int | None = Field(default=None, ge=1, le=4)
    reasoning: int | None = Field(default=None, ge=1, le=2)


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

    # Plan (linked)
    plan: LessonPlanRead | None = None

    students: list[SessionStudentRead]


# --- Attendance update ---


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
