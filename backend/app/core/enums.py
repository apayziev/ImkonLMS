"""Shared enums — single source of truth for status values."""

from enum import Enum


class SessionStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class AttendanceStatus(str, Enum):
    UNMARKED = "unmarked"
    PRESENT = "present"
    EXCUSED = "excused"
    UNEXCUSED = "unexcused"
