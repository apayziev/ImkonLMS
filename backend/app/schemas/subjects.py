"""Subject schemas — read-only (data synced from Payment)."""

from pydantic import ConfigDict, Field

from .base import PaginatedList, TimestampSchema


class SubjectRead(TimestampSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str = Field(min_length=1, max_length=100)
    name_uz: str | None = Field(default=None, max_length=100)
    icon: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=7, pattern=r"^#[0-9A-Fa-f]{6}$")


SubjectList = PaginatedList[SubjectRead]
