from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    log_level: str = "INFO"
    staff_api_secret: str = ""

    cors_origins: str = (
    "http://localhost:3000,"
    "http://127.0.0.1:3000"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
        origin.strip()
        for origin in self.cors_origins.split(",")
        if origin.strip()
    ]

    railradar_base_url: str = "https://api.railradar.in/v1"
    railradar_api_key: str | None = None
    openweather_api_key: str | None = None
    cache_ttl_seconds: int = 180
    max_live_requests_per_minute: int = 10
    railradar_max_requests_per_minute: int = 10
    search_cache_ttl_seconds: int = 900
    redis_enabled: bool = False
    redis_url: str = "redis://localhost:6379/0"
    redis_connect_timeout_seconds: float = 0.5
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""
    model_root: Path = PROJECT_ROOT / "artifacts" / "models"
    config_root: Path = PROJECT_ROOT / "artifacts" / "config"

    demo_payload_path: Path = (
        PROJECT_ROOT
        / "ml_handoff"
        / "raileta_space"
        / "demo"
        / "saved_journey_12615.json"
    )

    def validate_production(self) -> None:
        if self.app_env.strip().lower() != "production":
            return

        missing = []

        if not self.railradar_api_key:
            missing.append("RAILRADAR_API_KEY")

        if not self.openweather_api_key:
            missing.append("OPENWEATHER_API_KEY")

        if not self.cors_origin_list:
            missing.append("CORS_ORIGINS")

        if missing:
            raise RuntimeError(
                "Missing required production settings: "
                + ", ".join(missing)
            )

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()