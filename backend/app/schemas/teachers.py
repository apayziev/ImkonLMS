"""Teacher schemas — read-only (data synced from Payment)."""

from datetime import date

from pydantic import BaseModel, ConfigDict, model_validator


class TeacherRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: str
    first_name: str
    last_name: str
    middle_name: str | None = None
    full_name: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    phone_number: str | None = None
    photo_url: str | None = None
    is_active: bool
    subjects: list | None = None
    class_teacher_grade_id: int | None = None

    @model_validator(mode="after")
    def compute_full_name(self) -> "TeacherRead":
        self.full_name = f"{self.last_name} {self.first_name}"
        return self


class TeacherList(BaseModel):
    data: list[TeacherRead]
    count: int
