from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .base import PaginatedList, TimestampSchema


class QuarterCreate(BaseModel):
    academic_year_id: int
    number: int = Field(ge=1, le=4)
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_dates(self) -> "QuarterCreate":
        if self.end_date <= self.start_date:
            raise ValueError("Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak")
        return self


class QuarterUpdate(BaseModel):
    number: int | None = Field(default=None, ge=1, le=4)
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "QuarterUpdate":
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValueError("Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak")
        return self


class QuarterRead(TimestampSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    academic_year_id: int
    number: int
    start_date: date
    end_date: date


QuarterList = PaginatedList[QuarterRead]
