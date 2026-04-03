"""Violation schemas — qoidabuzarlik turlari va xabarlari."""

from pydantic import BaseModel


# === ViolationType ===

class ViolationTypeCreate(BaseModel):
    name: str
    description: str | None = None
    points: int = 1


class ViolationTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    points: int | None = None
    is_active: bool | None = None


class ViolationTypeRead(BaseModel):
    id: int
    name: str
    description: str | None
    points: int
    is_active: bool


# === ViolationReport ===

class ViolationReportCreate(BaseModel):
    student_id: int
    violation_type_id: int
    session_id: int | None = None
    note: str | None = None
    location: str | None = None
    occurred_at: str  # ISO datetime


class ViolationReportRead(BaseModel):
    id: int
    student_id: int
    violation_type: ViolationTypeRead
    note: str | None
    location: str | None
    occurred_at: str
    reported_by_name: str
    created_at: str


class ViolationSessionSummary(BaseModel):
    """Sessiya bo'yicha qoidabuzarlik xabarlari."""
    by_student: dict[int, list[ViolationReportRead]]
