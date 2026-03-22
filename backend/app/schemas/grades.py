from pydantic import BaseModel, ConfigDict, Field

from .base import TimestampSchema


class GradeBase(BaseModel):
    level: int = Field(ge=0, le=11)
    section: str = Field(min_length=1, max_length=50)


class GradeCreate(GradeBase):
    pass


class GradeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    level: int | None = Field(default=None, ge=0, le=11)
    section: str | None = Field(default=None, min_length=1, max_length=50)


class GradeRead(GradeBase, TimestampSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str


class GradeList(BaseModel):
    data: list[GradeRead]
    count: int
