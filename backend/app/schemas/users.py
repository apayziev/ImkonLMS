from datetime import date
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.config import today_local


# --- Read ---
class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: str
    first_name: str
    last_name: str
    full_name: str = ""  # from model property via from_attributes
    birth_date: date | None = None
    photo_url: str | None = None
    phone_number: str | None = None
    is_active: bool
    is_superuser: bool
    role: str
    teaching_grade_ids: list[int] | None = None
    age: int | None = None

    @model_validator(mode="after")
    def compute_age(self) -> Self:
        if self.birth_date:
            today = today_local()
            self.age = (
                today.year
                - self.birth_date.year
                - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
            )
        return self



# --- Auth ---
class LoginRequest(BaseModel):
    document_id: Annotated[str, Field(min_length=5, max_length=20, examples=["AA1234567"])]
    password: str

    @field_validator("document_id", mode="before")
    @classmethod
    def uppercase_document_id(cls, v: str) -> str:
        return v.upper() if isinstance(v, str) else v


class StudentLoginRequest(BaseModel):
    document_id: Annotated[str, Field(min_length=5, max_length=20, examples=["I-TM1234567"])]

    @field_validator("document_id", mode="before")
    @classmethod
    def uppercase_document_id(cls, v: str) -> str:
        return v.upper() if isinstance(v, str) else v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
