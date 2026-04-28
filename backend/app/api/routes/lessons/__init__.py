"""Lesson routes — assembled from sub-modules."""

from fastapi import APIRouter

from .attendance import router as attendance_router
from .materials import router as materials_router
from .schedule import router as schedule_router
from .sessions import router as sessions_router
from .stats import router as stats_router

router = APIRouter(prefix="/lessons", tags=["lessons"])

router.include_router(schedule_router)
router.include_router(sessions_router)
router.include_router(attendance_router)
router.include_router(materials_router)
router.include_router(stats_router)
