"""Timetable CRUD instances."""

from app.crud.base import BaseCRUD
from app.models.schedule_entry import ScheduleEntry
from app.models.time_slot import TimeSlot

crud_time_slots = BaseCRUD(TimeSlot)
crud_schedule_entries = BaseCRUD(ScheduleEntry)
