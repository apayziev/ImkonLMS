from fastapi import HTTPException, status


class BadRequestException(HTTPException):
    def __init__(self, detail: str = "Bad Request") -> None:
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class NotFoundException(HTTPException):
    def __init__(self, detail: str = "Not Found") -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ForbiddenException(HTTPException):
    def __init__(self, detail: str = "Forbidden") -> None:
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class UnauthorizedException(HTTPException):
    def __init__(self, detail: str = "Unauthorized") -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class DuplicateValueException(HTTPException):
    def __init__(self, detail: str = "Duplicate value") -> None:
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)
