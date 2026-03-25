from app.models.lesson_session import LessonSession
from app.models.session_attendance import SessionAttendance

from .base import BaseCRUD

crud_lesson_sessions = BaseCRUD(LessonSession)
crud_session_attendances = BaseCRUD(SessionAttendance)
