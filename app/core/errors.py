class RailETAError(Exception):
    """Base application exception."""

    code = "RAILETA_ERROR"
    status_code = 500
    retryable = False

    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details


class JourneyNotFoundError(RailETAError):
    code = "JOURNEY_NOT_FOUND"
    status_code = 404
    retryable = False


class ProviderRateLimitError(RailETAError):
    code = "PROVIDER_RATE_LIMITED"
    status_code = 429
    retryable = True


class ProviderUnavailableError(RailETAError):
    code = "PROVIDER_UNAVAILABLE"
    status_code = 503
    retryable = True


class ProviderTimeoutError(RailETAError):
    code = "PROVIDER_TIMEOUT"
    status_code = 504
    retryable = True


class ProviderConfigurationError(RailETAError):
    code = "PROVIDER_CONFIGURATION_ERROR"
    status_code = 503
    retryable = False


class ArtifactLoadError(RailETAError):
    code = "ARTIFACT_LOAD_ERROR"
    status_code = 503
    retryable = False


class PredictionError(RailETAError):
    code = "PREDICTION_ERROR"
    status_code = 500
    retryable = False


class InvalidJourneyStateError(RailETAError):
    code = "INVALID_JOURNEY_STATE"
    status_code = 422
    retryable = False