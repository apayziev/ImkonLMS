"""Student schemas for IMKON LMS — matching imkon-payment structure."""

from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, computed_field

from .base import TimestampSchema


class StudentBase(BaseModel):
    document_id: Annotated[str, Field(min_length=5, max_length=20)]
    first_name: Annotated[str, Field(min_length=2, max_length=50)]
    last_name: Annotated[str, Field(min_length=2, max_length=50)]
    middle_name: Annotated[str | None, Field(max_length=50)] = None
    birth_date: date | None = None
    gender: Annotated[str | None, Field(max_length=10)] = None
    phone_number: Annotated[str | None, Field(max_length=20)] = None


class StudentCreate(StudentBase):
    model_config = ConfigDict(extra="ignore")

    student_id: Annotated[str | None, Field(max_length=20)] = None
    grade_id: int | None = None
    father_first_name: Annotated[str | None, Field(max_length=50)] = None
    father_last_name: Annotated[str | None, Field(max_length=50)] = None
    father_phone: Annotated[str | None, Field(max_length=20)] = None
    mother_first_name: Annotated[str | None, Field(max_length=50)] = None
    mother_last_name: Annotated[str | None, Field(max_length=50)] = None
    mother_phone: Annotated[str | None, Field(max_length=20)] = None
    address: str | None = None
    enrollment_date: date | None = None
    withdrawal_date: date | None = None


class StudentUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    document_id: Annotated[str | None, Field(max_length=20)] = None
    first_name: Annotated[str | None, Field(max_length=50)] = None
    last_name: Annotated[str | None, Field(max_length=50)] = None
    middle_name: Annotated[str | None, Field(max_length=50)] = None
    birth_date: date | None = None
    gender: Annotated[str | None, Field(max_length=10)] = None
    phone_number: Annotated[str | None, Field(max_length=20)] = None
    student_id: str | None = None
    grade_id: int | None = None
    father_first_name: Annotated[str | None, Field(max_length=50)] = None
    father_last_name: Annotated[str | None, Field(max_length=50)] = None
    father_phone: Annotated[str | None, Field(max_length=20)] = None
    mother_first_name: Annotated[str | None, Field(max_length=50)] = None
    mother_last_name: Annotated[str | None, Field(max_length=50)] = None
    mother_phone: Annotated[str | None, Field(max_length=20)] = None
    address: str | None = None
    enrollment_date: date | None = None
    withdrawal_date: date | None = None
    is_active: bool | None = None


class StudentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: str
    first_name: str
    last_name: str
    middle_name: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    phone_number: str | None = None
    photo_url: str | None = None
    role: str
    is_active: bool
    student_id: str | None = None
    grade_id: int | None = None
    father_first_name: str | None = None
    father_last_name: str | None = None
    father_phone: str | None = None
    mother_first_name: str | None = None
    mother_last_name: str | None = None
    mother_phone: str | None = None
    address: str | None = None
    enrollment_date: date | None = None
    withdrawal_date: date | None = None

    # Freeze fields
    is_frozen: bool = False
    frozen_at: date | None = None
    frozen_reason: str | None = None
    departure_date: date | None = None
    return_date: date | None = None

    # Soft delete fields
    is_deleted: bool = False
    deleted_at: date | None = None

    @computed_field
    @property
    def full_name(self) -> str:
        parts = [self.last_name, self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        return " ".join(parts)

    @computed_field
    @property
    def father_full_name(self) -> str | None:
        if not self.father_last_name and not self.father_first_name:
            return None
        parts = [p for p in [self.father_last_name, self.father_first_name] if p]
        return " ".join(parts) if parts else None

    @computed_field
    @property
    def mother_full_name(self) -> str | None:
        if not self.mother_last_name and not self.mother_first_name:
            return None
        parts = [p for p in [self.mother_last_name, self.mother_first_name] if p]
        return " ".join(parts) if parts else None


class StudentList(BaseModel):
    data: list[StudentRead]
    count: int


class StudentFreezeRequest(BaseModel):
    departure_date: date | None = None
    reason: str | None = None


class StudentUnfreezeRequest(BaseModel):
    return_date: date


class StudentFreezeResponse(BaseModel):
    id: int
    full_name: str
    is_frozen: bool
    frozen_at: date | None = None
    frozen_reason: str | None = None
    departure_date: date | None = None
    return_date: date | None = None
    message: str
