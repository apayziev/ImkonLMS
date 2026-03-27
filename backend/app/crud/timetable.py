"""Timetable CRUD instances."""

from app.crud.base import BaseCRUD
from app.models.schedule_entry import ScheduleEntry
from app.models.school_settings import SchoolSettings
from app.models.time_slot import TimeSlot

crud_school_settings = BaseCRUD(SchoolSettings)
crud_time_slots = BaseCRUD(TimeSlot)
crud_schedule_entries = BaseCRUD(ScheduleEntry)
