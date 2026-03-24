from sqlalchemy import ForeignKey, Index, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class ScheduleEntry(BaseModel):
    """A single cell in the weekly timetable grid."""

    __tablename__ = "schedule_entry"

    __table_args__ = (
        # One lesson per grade per day per slot
        Index(
            "uq_schedule_grade_day_slot",
            "grade_id", "day_of_week", "time_slot_id", "academic_year_id",
            unique=True,
        ),
        # One teacher per day per slot
        Index(
            "uq_schedule_teacher_day_slot",
            "teacher_id", "day_of_week", "time_slot_id", "academic_year_id",
            unique=True,
        ),
    )

    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_year.id"), index=True, kw_only=True
    )
    grade_id: Mapped[int] = mapped_column(ForeignKey("grade.id"), index=True, kw_only=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subject.id"), index=True, kw_only=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, kw_only=True)
    time_slot_id: Mapped[int] = mapped_column(
        ForeignKey("time_slot.id", ondelete="CASCADE"), index=True, kw_only=True
    )
    day_of_week: Mapped[int] = mapped_column(SmallInteger, kw_only=True)  # 1=Mon … 7=Sun

    # === Relationships ===
    academic_year: Mapped["AcademicYear"] = relationship(init=False)
    grade: Mapped["Grade"] = relationship(init=False)
    subject: Mapped["Subject"] = relationship(init=False)
    teacher: Mapped["User"] = relationship(init=False)
    time_slot: Mapped["TimeSlot"] = relationship(init=False)
