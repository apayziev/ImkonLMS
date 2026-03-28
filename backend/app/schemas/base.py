"""Base schemas — shared by all modules."""

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class TimestampSchema(BaseModel):
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PaginatedList(BaseModel, Generic[T]):
    """Generic paginated list — replaces per-entity XxxList boilerplate."""

    data: list[T]
    count: int
