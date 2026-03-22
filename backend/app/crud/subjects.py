from app.models.subject import Subject

from .base import BaseCRUD


class CRUDSubject(BaseCRUD[Subject]):
    pass


crud_subjects = CRUDSubject(Subject)
