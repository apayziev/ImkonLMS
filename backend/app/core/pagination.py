"""Pagination defaults — single source of truth across all list endpoints."""

from typing import Annotated

from fastapi import Query

DEFAULT_LIMIT = 20
MAX_LIMIT = 100

SkipQuery = Annotated[int, Query(ge=0)]
LimitQuery = Annotated[int, Query(ge=1, le=MAX_LIMIT)]
