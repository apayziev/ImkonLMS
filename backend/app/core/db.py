from collections.abc import AsyncGenerator

from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass

from .config import settings


class Base(DeclarativeBase, MappedAsDataclass):
    pass


# URL.create() keeps the password in a SecretStr-like wrapper that masks it in
# repr/str output, so connection errors and tracebacks won't leak credentials.
DATABASE_URL = URL.create(
    drivername=settings.POSTGRES_ASYNC_PREFIX.removesuffix("://"),
    username=settings.POSTGRES_USER,
    password=settings.POSTGRES_PASSWORD.get_secret_value(),
    host=settings.POSTGRES_SERVER,
    port=settings.POSTGRES_PORT,
    database=settings.POSTGRES_DB,
)

async_engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
)

local_session = async_sessionmaker(
    bind=async_engine, class_=AsyncSession, expire_on_commit=False
)


async def async_get_db() -> AsyncGenerator[AsyncSession]:
    async with local_session() as db:
        yield db
