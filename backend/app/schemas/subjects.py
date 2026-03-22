from pydantic import BaseModel, ConfigDict, Field

from .base import TimestampSchema


class SubjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    name_uz: str | None = Field(default=None, max_length=100)
    icon: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=7, pattern=r"^#[0-9A-Fa-f]{6}$")


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=100)
    name_uz: str | None = None
    icon: str | None = None
    color: str | None = None


class SubjectRead(SubjectBase, TimestampSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int


class SubjectList(BaseModel):
    data: list[SubjectRead]
    count: int
