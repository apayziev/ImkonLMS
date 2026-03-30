"""Shared enums — single source of truth for status values."""

from enum import Enum


class SessionStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class AttendanceStatus(str, Enum):
    UNMARKED = "unmarked"
    PRESENT = "present"
    LATE = "late"
    ABSENT = "absent"
