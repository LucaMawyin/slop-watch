
import redis
import json
import hashlib
import time

from config.cache import REDIS_URL

ACTIVE_VERSION_KEY = "slop-watch:active-data-version"

cache = redis.Redis.from_url(
    REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=2,
    socket_timeout=2,
    health_check_interval=30,
    max_connections=20,
)

def make_cache_key(endpoint: str, version: int, params: dict):

    normalized = json.dumps(
        params,
        sort_keys=True,
        default=str,
        separators=(",", ":"),
    )

    digest = hashlib.sha256(
        normalized.encode()
    ).hexdigest()

    return f"slop-watch:v{version}:{endpoint}:{digest}"


def get_cached(key: str):

    try:
        result = cache.get(key)

        if result is None:
            print(f"REDIS CACHE MISS: {key}", flush=True)
            return None

        print(f"REDIS CACHE HIT: {key}", flush=True)

        return json.loads(result)

    except redis.RedisError as e:
        print(f"Redis read failed: {e}", flush=True)
        return None


def set_cached(key: str, content, ttl: int = 86400):

    try:
        cache.set(
            key,
            json.dumps(content, default=str),
            ex=max(1, ttl),
        )

    except (redis.RedisError, TypeError, ValueError) as e:
        print(f"Redis write failed: {e}", flush=True)

def get_active_version() -> int:
    try:
        version = cache.get(ACTIVE_VERSION_KEY)

        # Existing active version
        if version is not None:
            return int(version)

        # Initialize a new version if Redis has no version yet.
        # NX ensures only one process initializes it.
        initial_version = time.time_ns()

        cache.set(
            ACTIVE_VERSION_KEY,
            str(initial_version),
            nx=True,
        )

        version = cache.get(ACTIVE_VERSION_KEY)

        if version is None:
            raise RuntimeError("Could not initialize active cache version")

        return int(version)

    except (redis.RedisError, ValueError) as e:
        raise RuntimeError(
            f"Could not retrieve active cache version: {e}"
        ) from e


def set_active_version(version: int):
    try:
        cache.set(
            ACTIVE_VERSION_KEY,
            str(version),
        )

    except redis.RedisError as e:
        raise RuntimeError(
            f"Could not activate cache version: {e}"
        ) from e