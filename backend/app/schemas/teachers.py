"""Teacher schemas — read-only (data synced from Payment)."""

from datetime import date

from pydantic import BaseModel, ConfigDict

from .base import PaginatedList


class TeacherRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: str
    first_name: str
    last_name: str
    middle_name: str | None = None
    full_name: str = ""  # from model property via from_attributes
    birth_date: date | None = None
    gender: str | None = None
    phone_number: str | None = None
    photo_url: str | None = None
    is_active: bool
    subjects: list | None = None
    teaching_grade_ids: list[int] | None = None
    class_teacher_grade_id: int | None = None


TeacherList = PaginatedList[TeacherRead]
