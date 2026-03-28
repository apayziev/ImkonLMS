"""Lesson routes — assembled from sub-modules."""

from fastapi import APIRouter

from .attendance import router as attendance_router
from .materials import router as materials_router
from .sessions import router as sessions_router
from .today import router as today_router

router = APIRouter(prefix="/lessons", tags=["lessons"])

router.include_router(today_router)
router.include_router(sessions_router)
router.include_router(attendance_router)
router.include_router(materials_router)
