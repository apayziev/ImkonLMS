from app.models.school_settings import SchoolSettings
from app.models.schedule_entry import ScheduleEntry
from app.models.time_slot import TimeSlot

from .base import BaseCRUD


class CRUDSchoolSettings(BaseCRUD[SchoolSettings]):
    pass


class CRUDTimeSlot(BaseCRUD[TimeSlot]):
    pass


class CRUDScheduleEntry(BaseCRUD[ScheduleEntry]):
    pass


crud_school_settings = CRUDSchoolSettings(SchoolSettings)
crud_time_slots = CRUDTimeSlot(TimeSlot)
crud_schedule_entries = CRUDScheduleEntry(ScheduleEntry)
