
import redis
import json
import hashlib

from config.cache import REDIS_URL

cache = redis.Redis.from_url(
    REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=2,
    socket_timeout=2,
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
            return None

        return json.loads(result)

    except redis.RedisError as e:
        print(f"Redis read failed: {e}", flush=True)
        return None


def set_cached(key: str, content):

    try:
        cache.set(
            key,
            json.dumps(content, default=str),
        )

    except redis.RedisError as e:
        print(f"Redis write failed: {e}", flush=True)


def delete_old_versions(current_version: int):

    # Optional cleanup of old version keys.
    # Do not call during an update or before new
    # cache entries are ready.
    pass
