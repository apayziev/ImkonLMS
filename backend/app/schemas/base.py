"""Base schemas — shared by all modules."""

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class TimestampSchema(BaseModel):
    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat() if v else None},
    )

    created_at: datetime | None = None
    updated_at: datetime | None = None


class PaginatedList(BaseModel, Generic[T]):
    """Generic paginated list — replaces per-entity XxxList boilerplate."""

    data: list[T]
    count: int
