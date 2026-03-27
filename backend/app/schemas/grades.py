"""Grade schemas — read-only (data synced from Payment)."""

from pydantic import ConfigDict, Field

from .base import PaginatedList, TimestampSchema


class GradeRead(TimestampSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    level: int = Field(ge=0, le=11)
    section: str = Field(min_length=1, max_length=50)
    display_name: str


GradeList = PaginatedList[GradeRead]
