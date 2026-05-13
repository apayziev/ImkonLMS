"""Monitoring (teacher stats) schemas."""

from datetime import date, datetime

from pydantic import BaseModel


class TeacherStatRead(BaseModel):
    teacher_id: int
    teacher_name: str
    photo_url: str | None
    total_expected: int
    total_conducted: int
    total_completed: int
    total_planned: int  # dars rejasi mavjud
    on_time_starts: int
    avg_duration_minutes: float | None
    avg_plan_score: float | None  # 0-100 (filled/total %)


class TeacherStatsResponse(BaseModel):
    teachers: list[TeacherStatRead]


class TeacherSessionMaterial(BaseModel):
    id: int
    file_url: str
    original_name: str


class TeacherSessionDetail(BaseModel):
    session_id: int
    session_date: date
    status: str
    subject_name: str
    grade_display: str
    period_number: int
    start_time: str
    end_time: str
    started_at: datetime | None
    ended_at: datetime | None
    # Plan info (from linked LessonPlan)
    plan_id: int | None = None
    topic: str | None = None
    lesson_type: str | None = None
    objectives: list | None = None
    keywords: list[str] | None = None
    homework: str | None = None
    resources: list[str] | None = None
    assessment_methods: list[str] | None = None
    plan_filled_count: int = 0
    lesson_number: int = 0  # chorakdagi dars raqami


class TeacherDetailResponse(BaseModel):
    teacher_id: int
    teacher_name: str
    photo_url: str | None
    sessions: list[TeacherSessionDetail]
