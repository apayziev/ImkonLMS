from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any, Generic, TypeVar

from sqlalchemy import func, select
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

    async def update(
        self,
        db: AsyncSession,
        db_obj: ModelType,
        update_data: dict[str, Any],
    ) -> ModelType:
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_multi(
        self,
        db: AsyncSession,
        offset: int = 0,
        limit: int = 100,
        options: Sequence[Any] | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        base_query = self._build_query(**kwargs)

        count_query = select(func.count()).select_from(base_query.subquery())
        data_query = base_query.offset(offset).limit(limit)
        if options:
            data_query = data_query.options(*options)

        total_result, data_result = await db.execute(count_query), await db.execute(data_query)
        total_count = total_result.scalar_one()
        data = data_result.scalars().all()

        return {"data": data, "count": total_count}

    async def delete(
        self,
        db: AsyncSession,
        **kwargs: Any,
    ) -> bool:
        record = await self.get(db, **kwargs)
        if record is None:
            return False

        record.is_deleted = True
        record.deleted_at = datetime.now(UTC)
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return True


