"""Create first superuser on startup."""

import asyncio
import logging

from sqlalchemy import select

from app.core.config import settings
from app.core.db import async_get_db
from app.core.logging_utils import mask_phone
from app.core.security import get_password_hash
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


async def create_first_superuser() -> None:
    phone_number = settings.FIRST_SUPERUSER_PHONE
    document_id = settings.FIRST_SUPERUSER_DOCUMENT_ID

    async for db in async_get_db():
        # Check if admin already exists (by phone or document_id)
        result = await db.execute(
            select(User).where(
                (User.phone_number == phone_number) | (User.document_id == document_id)
            )
        )
        if result.scalars().first():
            logger.info("Superuser already exists.")
            return

        superuser = User(
            phone_number=phone_number,
            document_id=document_id,
            first_name=settings.FIRST_SUPERUSER_FIRST_NAME,
            last_name=settings.FIRST_SUPERUSER_LAST_NAME,
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD.get_secret_value()),
            role=UserRole.ADMIN.value,
            is_superuser=True,
            is_active=True,
        )
        db.add(superuser)
        await db.commit()
        logger.info("Superuser created: %s", mask_phone(phone_number))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(create_first_superuser())
