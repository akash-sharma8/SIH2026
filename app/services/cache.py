import json
import logging
import threading
import time
from copy import deepcopy
from typing import Any
from contextlib import contextmanager
from uuid import uuid4
from redis import Redis
from redis.exceptions import RedisError

logger = logging.getLogger("raileta.cache")

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



class ResilientCache:
    def __init__(
        self,
        ttl_seconds: int,
        redis_enabled: bool,
        redis_url: str,
        redis_connect_timeout_seconds: float,
    ) -> None:
        self.ttl_seconds = ttl_seconds

        self._fallback = TTLCache(
            ttl_seconds=ttl_seconds,
        )

        self._local_locks: dict[
            str,
            threading.Lock,
        ] = {}

        self._local_locks_guard = (
            threading.Lock()
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
            )

            client.ping()

            self._redis = client

            logger.info(
                "redis_cache_enabled"
            )

        except RedisError as exc:
            logger.warning(
                "redis_cache_unavailable "
                "fallback=in_memory error=%s",
                exc,
            )

    def get(
        self,
        key: str,
    ) -> Any | None:
        if self._redis is not None:
            try:
                value = self._redis.get(
                    key
                )

                if value is None:
                    return None

                return json.loads(
                    value
                )

            except (
                RedisError,
                json.JSONDecodeError,
            ) as exc:
                logger.warning(
                    "redis_cache_get_failed "
                    "key=%s fallback=in_memory error=%s",
                    key,
                    exc,
                )

        return self._fallback.get(
            key
        )

    def set(
        self,
        key: str,
        value: Any,
    ) -> None:
        if self._redis is not None:
            try:
                self._redis.set(
                    key,
                    json.dumps(
                        value
                    ),
                    ex=self.ttl_seconds,
                )

                return

            except (
                RedisError,
                TypeError,
            ) as exc:
                logger.warning(
                    "redis_cache_set_failed "
                    "key=%s fallback=in_memory error=%s",
                    key,
                    exc,
                )

        self._fallback.set(
            key,
            value,
        )

    def delete(
        self,
        key: str,
    ) -> None:
        if self._redis is not None:
            try:
                self._redis.delete(
                    key
                )

            except RedisError as exc:
                logger.warning(
                    "redis_cache_delete_failed "
                    "key=%s error=%s",
                    key,
                    exc,
                )

        self._fallback.delete(
            key
        )

    def clear(self) -> None:
        if self._redis is not None:
            logger.warning(
                "redis_clear_skipped "
                "reason=global_flush_not_allowed"
            )

        self._fallback.clear()

    def size(self) -> int:
        if self._redis is not None:
            try:
                return int(
                    self._redis.dbsize()
                )

            except RedisError:
                pass

        return self._fallback.size()

    def _get_local_lock(
        self,
        key: str,
    ) -> threading.Lock:
        with self._local_locks_guard:
            lock = self._local_locks.get(
                key
            )

            if lock is None:
                lock = threading.Lock()

                self._local_locks[key] = (
                    lock
                )

            return lock


    @contextmanager
    def single_flight(
        self,
        key: str,
        *,
        lock_ttl_seconds: int = 15,
    ):
        lock_key = (
            f"lock:{key}"
        )

        if self._redis is None:
            local_lock = (
                self._get_local_lock(
                    lock_key
                )
            )

            with local_lock:
                yield

            return

        token = uuid4().hex

        acquired = False

        try:
            acquired = bool(
                self._redis.set(
                    lock_key,
                    token,
                    nx=True,
                    ex=lock_ttl_seconds,
                )
            )

        except RedisError as exc:
            logger.warning(
                "redis_lock_acquire_failed "
                "key=%s fallback=in_memory error=%s",
                lock_key,
                exc,
            )

            local_lock = (
                self._get_local_lock(
                    lock_key
                )
            )

            with local_lock:
                yield

            return

        if acquired:
            try:
                yield

            finally:
                release_script = """
                if redis.call(
                    'get',
                    KEYS[1]
                ) == ARGV[1] then
                    return redis.call(
                        'del',
                        KEYS[1]
                    )
                end

                return 0
                """

                try:
                    self._redis.eval(
                        release_script,
                        1,
                        lock_key,
                        token,
                    )

                except RedisError as exc:
                    logger.warning(
                        "redis_lock_release_failed "
                        "key=%s error=%s",
                        lock_key,
                        exc,
                    )

            return

        # Another replica already owns the Redis lock.
        # Wait briefly for it to populate the cache.
        deadline = (
            time.monotonic()
            + lock_ttl_seconds
        )

        while (
            time.monotonic()
            < deadline
        ):
            time.sleep(0.05)

            try:
                if not self._redis.exists(
                    lock_key
                ):
                    break

            except RedisError:
                break

        yield