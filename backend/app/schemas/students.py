"""Student schemas for IMKON LMS."""

from datetime import date
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .base import TimestampSchema


class StudentBase(BaseModel):
    document_id: Annotated[str, Field(min_length=5, max_length=20, examples=["I-LM2026001"])]
    first_name: Annotated[str, Field(min_length=2, max_length=50, examples=["Aziz"])]
    last_name: Annotated[str, Field(min_length=2, max_length=50, examples=["Toshmatov"])]

    @field_validator("document_id", mode="before")
    @classmethod
    def uppercase_document_id(cls, v: str) -> str:
        return v.upper() if isinstance(v, str) else v


class StudentCreate(StudentBase):
    model_config = ConfigDict(extra="ignore")

    student_id: str | None = None
    grade_id: int | None = None
    birth_date: date | None = None
    gender: str | None = None
    phone_number: str | None = None
    father_name: str | None = None
    father_phone: str | None = None
    mother_name: str | None = None
    mother_phone: str | None = None
    address: str | None = None
    enrollment_date: date | None = None

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        if v is not None and v not in ("male", "female"):
            raise ValueError("Jins faqat 'male' yoki 'female' bo'lishi mumkin")
        return v


class StudentUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    first_name: Annotated[str | None, Field(min_length=2, max_length=50, default=None)]
    last_name: Annotated[str | None, Field(min_length=2, max_length=50, default=None)]
    student_id: str | None = None
    grade_id: int | None = None
    birth_date: date | None = None
    gender: str | None = None
    phone_number: str | None = None
    father_name: str | None = None
    father_phone: str | None = None
    mother_name: str | None = None
    mother_phone: str | None = None
    address: str | None = None
    enrollment_date: date | None = None
    is_active: bool | None = None

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        if v is not None and v not in ("male", "female"):
            raise ValueError("Jins faqat 'male' yoki 'female' bo'lishi mumkin")
        return v


class StudentRead(TimestampSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: str
    first_name: str
    last_name: str
    full_name: str | None = None
    student_id: str | None = None
    grade_id: int | None = None
    grade_name: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    phone_number: str | None = None
    photo_url: str | None = None
    father_name: str | None = None
    father_phone: str | None = None
    mother_name: str | None = None
    mother_phone: str | None = None
    address: str | None = None
    enrollment_date: date | None = None
    is_active: bool
    age: int | None = None

    @model_validator(mode="after")
    def compute_fields(self) -> Self:
        self.full_name = f"{self.first_name} {self.last_name}"
        if self.birth_date:
            today = date.today()
            self.age = (
                today.year
                - self.birth_date.year
                - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
            )
        return self


class StudentList(BaseModel):
    data: list[StudentRead]
    count: int
