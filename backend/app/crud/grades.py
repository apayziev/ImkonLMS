from app.models.grade import Grade

from .base import BaseCRUD


class CRUDGrade(BaseCRUD[Grade]):
    pass


crud_grades = CRUDGrade(Grade)
