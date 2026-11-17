
import redis
import json
import hashlib

from config.cache import REDIS_URL

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