import threading
import time
from copy import deepcopy
from typing import Any


class TTLCache:
    def __init__(
        self,
        ttl_seconds: int,
    ) -> None:
        if ttl_seconds <= 0:
            raise ValueError(
                "ttl_seconds must be greater than 0."
            )

        self.ttl_seconds = ttl_seconds

        self._store: dict[
            str,
            tuple[float, Any],
        ] = {}

        self._lock = threading.Lock()

    def get(
        self,
        key: str,
    ) -> Any | None:
        now = time.monotonic()

        with self._lock:
            item = self._store.get(key)

            if item is None:
                return None

            expires_at, value = item

            if now >= expires_at:
                self._store.pop(
                    key,
                    None,
                )
                return None

            return deepcopy(value)

    def set(
        self,
        key: str,
        value: Any,
    ) -> None:
        expires_at = (
            time.monotonic()
            + self.ttl_seconds
        )

        with self._lock:
            self._store[key] = (
                expires_at,
                deepcopy(value),
            )

    def delete(
        self,
        key: str,
    ) -> None:
        with self._lock:
            self._store.pop(
                key,
                None,
            )

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        with self._lock:
            return len(self._store)