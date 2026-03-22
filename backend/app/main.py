import logging
from pathlib import Path

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .api import router
from .core.setup import create_application

logger = logging.getLogger(__name__)

app = create_application(router=router)

# Mount static files for uploads
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle uncaught exceptions."""
    logger.error(
        "Unhandled exception: %s | %s %s",
        type(exc).__name__,
        request.method,
        request.url.path,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Ichki server xatosi. Iltimos keyinroq urinib ko'ring."},
    )
