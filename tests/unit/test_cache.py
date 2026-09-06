from unittest.mock import patch

from app.services.cache import TTLCache


def test_cache_hit():
    cache = TTLCache(
        ttl_seconds=180
    )

    cache.set(
        "train:12615",
        {"success": True},
    )

    assert cache.get(
        "train:12615"
    ) == {
        "success": True
    }


def test_cache_miss():
    cache = TTLCache(
        ttl_seconds=180
    )

    assert cache.get(
        "missing"
    ) is None


def test_cache_expiry():
    cache = TTLCache(
        ttl_seconds=10
    )

    with patch(
        "app.services.cache.time.monotonic",
        side_effect=[
            100.0,
            105.0,
            111.0,
        ],
    ):
        cache.set(
            "train:12615",
            {"success": True},
        )

        assert cache.get(
            "train:12615"
        ) is not None

        assert cache.get(
            "train:12615"
        ) is None


def test_cache_returns_deep_copy():
    cache = TTLCache(
        ttl_seconds=180
    )

    original = {
        "data": {
            "delay": 10
        }
    }

    cache.set(
        "train:12615",
        original,
    )

    cached = cache.get(
        "train:12615"
    )

    cached["data"]["delay"] = 999

    second_read = cache.get(
        "train:12615"
    )

    assert (
        second_read["data"]["delay"]
        == 10
    )


def test_cache_stores_deep_copy():
    cache = TTLCache(
        ttl_seconds=180
    )

    original = {
        "data": {
            "delay": 10
        }
    }

    cache.set(
        "train:12615",
        original,
    )

    original["data"]["delay"] = 999

    cached = cache.get(
        "train:12615"
    )

    assert (
        cached["data"]["delay"]
        == 10
    )