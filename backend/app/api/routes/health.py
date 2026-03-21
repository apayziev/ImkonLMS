from datetime import UTC, datetime

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.deps import SessionDep
from app.core.config import settings

router = APIRouter(tags=["health"])

STATUS_HEALTHY = "healthy"
STATUS_UNHEALTHY = "unhealthy"


@router.get("/health")
async def health() -> JSONResponse:
    """Basic health check."""
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": STATUS_HEALTHY,
            "environment": settings.ENVIRONMENT.value,
            "version": settings.APP_VERSION,
            "timestamp": datetime.now(UTC).isoformat(timespec="seconds"),
        },
    )


@router.get("/ready")
async def ready(db: SessionDep) -> JSONResponse:
    """Readiness check — DB connectivity."""
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    overall = STATUS_HEALTHY if db_ok else STATUS_UNHEALTHY
    http_status = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=http_status,
        content={
            "status": overall,
            "environment": settings.ENVIRONMENT.value,
            "version": settings.APP_VERSION,
            "database": STATUS_HEALTHY if db_ok else STATUS_UNHEALTHY,
            "timestamp": datetime.now(UTC).isoformat(timespec="seconds"),
        },
    )
