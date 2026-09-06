import pytest

from app.core.config import Settings


def test_production_validation_skips_in_development():
    settings = Settings(
        app_env="development",
        railradar_api_key=None,
        openweather_api_key=None,
        cors_origins="",
    )

    settings.validate_production()


def test_production_validation_fails_when_required_settings_missing():
    settings = Settings(
        app_env="production",
        railradar_api_key=None,
        openweather_api_key=None,
        cors_origins="",
    )

    with pytest.raises(RuntimeError) as exc_info:
        settings.validate_production()

    message = str(exc_info.value)

    assert "RAILRADAR_API_KEY" in message
    assert "OPENWEATHER_API_KEY" in message
    assert "CORS_ORIGINS" in message


def test_production_validation_passes_with_required_settings():
    settings = Settings(
        app_env="production",
        railradar_api_key="test-railradar-key",
        openweather_api_key="test-weather-key",
        cors_origins="https://example.com",
    )

    settings.validate_production()