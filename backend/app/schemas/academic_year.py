from pydantic import BaseModel, ConfigDict, Field

from .base import TimestampSchema


class AcademicYearRead(TimestampSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_year: int
    end_year: int
    start_month: int = Field(ge=1, le=12)
    end_month: int = Field(ge=1, le=12)
    is_current: bool


class AcademicYearList(BaseModel):
    data: list[AcademicYearRead]
    count: int
