"""Application configuration via pydantic-settings (env vars + .env)."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8000
    db_path: str = "app.db"
    admin_token: str = "dev-admin"
    analyzer: str = "rule"  # "rule" | "vidyut"
    log_level: str = "INFO"
    cors_origins: str = "*"

    model_config = {"env_prefix": "", "env_file": ".env", "extra": "ignore"}


settings = Settings()