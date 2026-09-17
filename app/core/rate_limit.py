import logging
import threading
import time
from collections import defaultdict, deque

from redis import Redis
from redis.exceptions import RedisError


logger = logging.getLogger(
    "raileta.rate_limit"
)

class SlidingWindowRateLimiter:
    def __init__(
        self,
        max_requests: int,
        window_seconds: int = 60,
    ) -> None:
        if max_requests <= 0:
            raise ValueError(
                "max_requests must be greater than 0."
            )

        if window_seconds <= 0:
            raise ValueError(
                "window_seconds must be greater than 0."
            )

        self.max_requests = max_requests
        self.window_seconds = window_seconds

        self._requests: dict[
            str,
            deque[float],
        ] = defaultdict(deque)

        self._lock = threading.Lock()

    def allow(
        self,
        key: str,
    ) -> bool:
        now = time.monotonic()
        cutoff = (
            now - self.window_seconds
        )

        with self._lock:
            bucket = self._requests[key]

            while (
                bucket
                and bucket[0] <= cutoff
            ):
                bucket.popleft()

            if (
                len(bucket)
                >= self.max_requests
            ):
                return False

            bucket.append(now)
            return True

    def clear(self) -> None:
        with self._lock:
            self._requests.clear()

class RedisGlobalRateLimiter:
    def __init__(
        self,
        max_requests: int,
        window_seconds: int,
        redis_enabled: bool,
        redis_url: str,
        redis_connect_timeout_seconds: float,
    ) -> None:
        if max_requests <= 0:
            raise ValueError(
                "max_requests must be greater than 0."
            )

        if window_seconds <= 0:
            raise ValueError(
                "window_seconds must be greater than 0."
            )

        self.max_requests = max_requests
        self.window_seconds = window_seconds

        self._fallback = (
            SlidingWindowRateLimiter(
                max_requests=max_requests,
                window_seconds=window_seconds,
            )
        )

        self._redis: Redis | None = None

        if not redis_enabled:
            return

        try:
            client = Redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=(
                    redis_connect_timeout_seconds
                ),
                socket_timeout=(
                    redis_connect_timeout_seconds
                ),
                health_check_interval=30,
                socket_keepalive=True,
            )

            client.ping()

            self._redis = client

            logger.info(
                "redis_rate_limiter_enabled"
            )

        except RedisError as exc:
            logger.warning(
                "redis_rate_limiter_unavailable "
                "fallback=in_memory error=%s",
                exc,
            )

    def allow(
        self,
        key: str,
    ) -> bool:
        if self._redis is None:
            return self._fallback.allow(
                key
            )

        redis_key = (
            f"rate-limit:{key}"
        )

        try:
            count = self._redis.incr(
                redis_key
            )

            if count == 1:
                self._redis.expire(
                    redis_key,
                    self.window_seconds,
                )

            return (
                count
                <= self.max_requests
            )

        except RedisError as exc:
            logger.warning(
                "redis_rate_limit_failed "
                "key=%s fallback=in_memory "
                "error=%s",
                redis_key,
                exc,
            )

            return self._fallback.allow(
                key
            )

    def clear(self) -> None:
        self._fallback.clear()