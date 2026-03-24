from app.models.academic_year import AcademicYear

from .base import BaseCRUD


class CRUDAcademicYear(BaseCRUD[AcademicYear]):
    pass


crud_academic_years = CRUDAcademicYear(AcademicYear)
