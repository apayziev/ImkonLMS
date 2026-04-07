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

    async def _paginate_query(
        self,
        db: AsyncSession,
        query: Select,
        *,
        options: Sequence[Any] | None = None,
        order_by: Any | Sequence[Any] | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> tuple[list[ModelType], int]:
        """Count + fetch paginated results from a pre-built query."""
        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar_one()
        data_q = query
        if options:
            data_q = data_q.options(*options)
        if order_by is not None:
            data_q = data_q.order_by(*(order_by if isinstance(order_by, (list, tuple)) else [order_by]))
        data_q = data_q.offset(offset).limit(limit)
        rows = (await db.execute(data_q)).scalars().all()
        return list(rows), total

    async def get_multi(
        self,
        db: AsyncSession,
        offset: int = 0,
        limit: int = 100,
        options: Sequence[Any] | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        base_query = self._build_query(**kwargs)
        data, total = await self._paginate_query(
            db, base_query, options=options, offset=offset, limit=limit,
        )
        return {"data": data, "count": total}

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


