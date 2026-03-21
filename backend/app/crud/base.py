from collections.abc import Sequence
from typing import Any, Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from app.models.base import BaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)


class BaseCRUD(Generic[ModelType]):
    def __init__(self, model: type[ModelType]):
        self.model = model

    def _build_query(
        self,
        options: Sequence[Any] | None = None,
        **kwargs: Any,
    ) -> Select[tuple[ModelType]]:
        query = select(self.model)
        if options:
            query = query.options(*options)
        for field, value in kwargs.items():
            query = query.where(getattr(self.model, field) == value)
        return query

    async def get(
        self,
        db: AsyncSession,
        options: Sequence[Any] | None = None,
        **kwargs: Any,
    ) -> ModelType | None:
        query = self._build_query(options=options, **kwargs)
        result = await db.execute(query)
        return result.scalar_one_or_none()
