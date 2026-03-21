"""Create first superuser on startup."""

import asyncio
import logging

from app.core.config import settings
from app.core.db import async_get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


async def create_first_superuser() -> None:
    async for db in async_get_db():
        from app.crud.users import crud_users

        existing = await crud_users.get_by_document_id(db, document_id=settings.ADMIN_DOCUMENT_ID)
        if existing:
            logger.info("Superuser already exists: %s", settings.ADMIN_DOCUMENT_ID)
            return

        superuser = User(
            document_id=settings.ADMIN_DOCUMENT_ID,
            first_name=settings.ADMIN_FIRST_NAME,
            last_name=settings.ADMIN_LAST_NAME,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD.get_secret_value()),
            role=UserRole.ADMIN.value,
            is_superuser=True,
            is_active=True,
        )
        db.add(superuser)
        await db.commit()
        logger.info("Superuser created: %s", settings.ADMIN_DOCUMENT_ID)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(create_first_superuser())
