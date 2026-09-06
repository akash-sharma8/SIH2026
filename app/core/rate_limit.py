import threading
import time
from collections import defaultdict, deque


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