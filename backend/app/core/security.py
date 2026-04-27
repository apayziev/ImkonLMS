from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import Any

import bcrypt
import jwt
from fastapi.security import OAuth2PasswordBearer

from .config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login/access-token")


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _create_token(
    data: dict[str, Any],
    token_type: TokenType,
    default_expires: timedelta,
    expires_delta: timedelta | None = None,
) -> str:
    to_encode = data.copy()
    expire = datetime.now(UTC).replace(tzinfo=None) + (expires_delta or default_expires)
    to_encode.update({"exp": expire, "token_type": token_type})
    return jwt.encode(to_encode, settings.SECRET_KEY.get_secret_value(), algorithm=settings.ALGORITHM)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    return _create_token(data, TokenType.ACCESS, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), expires_delta)


def create_refresh_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    return _create_token(data, TokenType.REFRESH, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), expires_delta)


def verify_token(token: str, expected_token_type: TokenType) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY.get_secret_value(), algorithms=[settings.ALGORITHM])
        document_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("token_type")
        if document_id is None or token_type != expected_token_type:
            return None
        return {
            "document_id": document_id,
            "role": payload.get("role"),
            "jti": payload.get("jti"),
            "fid": payload.get("fid"),
        }
    except jwt.PyJWTError:
        return None
