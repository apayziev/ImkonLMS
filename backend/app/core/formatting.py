"""Shared utility functions."""

from typing import Any


def format_time(t: Any) -> str:
    """Format a time object to HH:MM string."""
    if hasattr(t, "strftime"):
        return t.strftime("%H:%M")
    return str(t)
