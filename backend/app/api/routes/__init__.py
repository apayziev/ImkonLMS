"""IMKON LMS - API Routes."""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user

from .academic_years import router as academic_years_router
from .config import router as config_router
from .grades import router as grades_router
from .health import router as health_router
from .lessons import router as lessons_router
from .login import router as login_router
from .logout import router as logout_router
from .parent import router as parent_router
from .parents import router as parents_router
from .quarters import router as quarters_router
from .students import router as students_router
from .subjects import router as subjects_router
from .sync import router as sync_router
from .teachers import router as teachers_router
from .timetable import router as timetable_router
from .tms import router as tms_router
from .users import router as users_router

router = APIRouter(prefix="/v1")

# Public routes
router.include_router(health_router)
router.include_router(config_router)
router.include_router(login_router)

# Protected routes
router.include_router(logout_router, dependencies=[Depends(get_current_user)])
router.include_router(users_router, dependencies=[Depends(get_current_user)])
router.include_router(academic_years_router, dependencies=[Depends(get_current_user)])
router.include_router(grades_router, dependencies=[Depends(get_current_user)])
router.include_router(subjects_router, dependencies=[Depends(get_current_user)])
router.include_router(students_router, dependencies=[Depends(get_current_user)])
router.include_router(teachers_router, dependencies=[Depends(get_current_user)])
router.include_router(timetable_router, dependencies=[Depends(get_current_user)])
router.include_router(lessons_router, dependencies=[Depends(get_current_user)])
router.include_router(quarters_router, dependencies=[Depends(get_current_user)])
router.include_router(sync_router, dependencies=[Depends(get_current_user)])
router.include_router(tms_router, dependencies=[Depends(get_current_user)])
router.include_router(parents_router, dependencies=[Depends(get_current_user)])

# Parent portal (own auth via get_current_parent dependency)
router.include_router(parent_router)
