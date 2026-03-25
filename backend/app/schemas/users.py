import re
from datetime import date
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.user import UserRole

PASSWORD_MIN_LENGTH = 8
_UPPERCASE = re.compile(r"[A-Z]")
_LOWERCASE = re.compile(r"[a-z]")
_DIGIT = re.compile(r"[0-9]")
_SPECIAL = re.compile(r'[!@#$%^&*(),.?\":{}|<>]')


def validate_password_strength(password: str) -> str:
    errors = []
    if len(password) < PASSWORD_MIN_LENGTH:
        errors.append(f"Kamida {PASSWORD_MIN_LENGTH} ta belgi")
    if not _UPPERCASE.search(password):
        errors.append("Kamida 1 katta harf (A-Z)")
    if not _LOWERCASE.search(password):
        errors.append("Kamida 1 kichik harf (a-z)")
    if not _DIGIT.search(password):
        errors.append("Kamida 1 raqam (0-9)")
    if not _SPECIAL.search(password):
        errors.append("Kamida 1 maxsus belgi (!@#$%^&*)")
    if errors:
        raise ValueError("; ".join(errors))
    return password


# --- Base ---
class UserBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    document_id: Annotated[str, Field(min_length=5, max_length=20, examples=["AA1234567"])]
    first_name: Annotated[str, Field(min_length=2, max_length=50, examples=["Aziz"])]
    last_name: Annotated[str, Field(min_length=2, max_length=50, examples=["Toshmatov"])]
    birth_date: date | None = None
    role: str = UserRole.STUDENT.value

    @field_validator("document_id", mode="before")
    @classmethod
    def uppercase_document_id(cls, v: str) -> str:
        return v.upper() if isinstance(v, str) else v


# --- Create ---
class UserCreate(UserBase):
    model_config = ConfigDict(extra="ignore")

    password: Annotated[str | None, Field(default=None, min_length=8, examples=["Imkon@123"])]
    phone_number: str | None = None
    is_active: bool = True
    photo_url: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str | None) -> str | None:
        if v is not None:
            return validate_password_strength(v)
        return v

    @model_validator(mode="after")
    def verify_password_requirements(self) -> Self:
        if self.role != UserRole.STUDENT.value and not self.password:
            raise ValueError("Xodimlar uchun parol majburiy")
        return self


# --- Read ---
class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: str
    first_name: str
    last_name: str
    full_name: str | None = None
    birth_date: date | None = None
    photo_url: str | None = None
    phone_number: str | None = None
    is_active: bool
    is_superuser: bool
    role: str
    teaching_grade_ids: list[int] | None = None
    age: int | None = None

    @model_validator(mode="after")
    def compute_full_name_and_age(self) -> Self:
        self.full_name = f"{self.first_name} {self.last_name}"
        if self.birth_date:
            today = date.today()
            self.age = (
                today.year
                - self.birth_date.year
                - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
            )
        return self


# --- Update ---
class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    document_id: Annotated[str | None, Field(min_length=5, max_length=20, default=None)]
    first_name: Annotated[str | None, Field(min_length=2, max_length=50, default=None)]
    last_name: Annotated[str | None, Field(min_length=2, max_length=50, default=None)]
    birth_date: date | None = None
    photo_url: str | None = None
    phone_number: str | None = None
    role: str | None = None
    password: str | None = Field(default=None, min_length=8)
    is_active: bool | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str | None) -> str | None:
        if v is not None:
            return validate_password_strength(v)
        return v


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
