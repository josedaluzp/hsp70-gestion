import sys

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "HSP-70 Gestión"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    DATABASE_URL: str = "sqlite+aiosqlite:///./hsp70.db"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Comma-separated list of allowed origins, e.g.:
    # CORS_ORIGINS=https://hsp70.vercel.app,https://hsp70.com
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:5174"]

    RATE_LIMIT_GENERAL: str = "100/15minutes"
    RATE_LIMIT_AUTH: str = "5/15minutes"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

if settings.SECRET_KEY == "change-me-in-production" and not settings.DEBUG:
    print(
        "FATAL: SECRET_KEY must be changed in production. "
        "Set SECRET_KEY in your .env file or set DEBUG=true for development.",
        file=sys.stderr,
    )
    sys.exit(1)
