"""User routes for IMKON LMS."""

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.schemas.users import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def read_user_me(current_user: CurrentUser) -> UserRead:
    """Joriy foydalanuvchi ma'lumotlarini olish."""
    return UserRead.model_validate(current_user)
