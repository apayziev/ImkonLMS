from enum import Enum

from pydantic import SecretStr, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    APP_NAME: str = "IMKON LMS"
    APP_DESCRIPTION: str = "Learning Management System for IMKON Liderlar Maktabi"
    APP_VERSION: str = "0.1.0"
    CONTACT_NAME: str = "IMKON Liderlar Maktabi"
    CONTACT_EMAIL: str = "info@imkon.uz"


class CryptSettings(BaseSettings):
    SECRET_KEY: SecretStr
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7


class DatabaseSettings(BaseSettings):
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: SecretStr = SecretStr("postgres")
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "imkon_lms_db"
    POSTGRES_ASYNC_PREFIX: str = "postgresql+asyncpg://"

    @computed_field
    @property
    def POSTGRES_URI(self) -> str:
        creds = f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD.get_secret_value()}"
        location = f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        return f"{creds}@{location}"


class FirstUserSettings(BaseSettings):
    FIRST_SUPERUSER_PHONE: str  # Required — no default, must be set via .env
    FIRST_SUPERUSER_PASSWORD: SecretStr  # Required — no default, must be set via .env
    FIRST_SUPERUSER_DOCUMENT_ID: str = "ADMIN000"
    FIRST_SUPERUSER_FIRST_NAME: str = "Admin"
    FIRST_SUPERUSER_LAST_NAME: str = "User"


class EnvironmentOption(str, Enum):
    LOCAL = "local"
    STAGING = "staging"
    PRODUCTION = "production"


class EnvironmentSettings(BaseSettings):
    ENVIRONMENT: EnvironmentOption = EnvironmentOption.LOCAL


class SyncSettings(BaseSettings):
    PAYMENT_API_URL: str = "https://imkonschool.uz"
    PAYMENT_SYNC_API_KEY: str = ""


class CORSSettings(BaseSettings):
    CORS_ORIGINS_STR: str = "http://localhost:5173"
    CORS_METHODS: list[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    CORS_HEADERS: list[str] = ["Authorization", "Content-Type", "Accept"]

    @computed_field
    @property
    def CORS_ORIGINS(self) -> list[str]:
        return [item.strip() for item in self.CORS_ORIGINS_STR.split(",") if item.strip()]


class Settings(
    AppSettings,
    DatabaseSettings,
    CryptSettings,
    FirstUserSettings,
    EnvironmentSettings,
    CORSSettings,
    SyncSettings,
):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
