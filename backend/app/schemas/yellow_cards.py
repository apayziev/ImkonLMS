"""Yellow card schemas."""

from pydantic import BaseModel, ConfigDict


class YellowCardCreate(BaseModel):
    student_id: int
    session_id: int
    reason: str | None = None


class YellowCardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    reason: str | None
    created_at: str
    issued_by_name: str


class YellowCardSessionSummary(BaseModel):
    """Session uchun sariq kartochkalar: limit + har o'quvchi bo'yicha ro'yxat."""

    limit: int
    by_student: dict[int, list[YellowCardRead]]  # student_id → cards
