
import redis
import json
import hashlib
import time

from config.cache import REDIS_URL

ACTIVE_VERSION_KEY = "slop-watch:active-data-version"
DATASET_SLOT_PREFIX = "slop-watch:dataset-slot:"

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

    except (redis.RedisError, json.JSONDecodeError) as e:
        print(f"Redis read failed: {e}", flush=True)
        return None

def get_cached_many(keys: list[str]) -> list:

    try:
        with cache.pipeline(transaction=False) as pipe:
            for key in keys:
                pipe.get(key)

            results = pipe.execute()

        return [
            json.loads(result) if result is not None else None
            for result in results
        ]

    except (redis.RedisError, json.JSONDecodeError) as e:
        print(f"Redis bulk read failed: {e}", flush=True)
        return [None] * len(keys)


def set_cached(key: str, content, ttl: int = 86400) -> bool:

    try:
        return bool(
            cache.set(
                key,
                json.dumps(content, default=str),
                ex=max(1, ttl),
            )
        )

    except (redis.RedisError, TypeError, ValueError) as e:
        print(f"Redis write failed: {e}", flush=True)
        return False

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
        result = cache.set(
            ACTIVE_VERSION_KEY,
            str(version),
        )

        if not result:
            raise RuntimeError(
                "Redis did not confirm active version update"
            )

    except redis.RedisError as e:
        raise RuntimeError(
            f"Could not activate cache version: {e}"
        ) from e

def set_dataset_slot(cache_version: int, slot: str):
    if slot not in ("primary", "candidate"):
        raise ValueError(f"Invalid dataset slot: {slot}")

    try:
        result = cache.set(
            f"{DATASET_SLOT_PREFIX}{cache_version}",
            slot,
        )

        if not result:
            raise RuntimeError(
                "Redis did not confirm dataset slot update"
            )

    except redis.RedisError as e:
        raise RuntimeError(
            f"Could not save dataset slot: {e}"
        ) from e


def get_dataset_slot(cache_version: int) -> str:
    try:
        slot = cache.get(
            f"{DATASET_SLOT_PREFIX}{cache_version}"
        )

        # Existing versions created before dataset-slot
        # management use the original primary files.
        if slot is None:
            return "primary"

        if slot not in ("primary", "candidate"):
            raise RuntimeError(
                f"Invalid dataset slot registered for "
                f"version {cache_version}: {slot}"
            )

        return slot

    except redis.RedisError as e:
        raise RuntimeError(
            f"Could not retrieve dataset slot: {e}"
        ) from e


def set_model_versions(cache_version: int, model_versions: dict):
    key = f"slop-watch:model-versions:{cache_version}"

    try:
        if not isinstance(model_versions, dict) or not model_versions:
            raise ValueError("Model versions cannot be empty")

        if any(
            not league or version is None
            for league, version in model_versions.items()
        ):
            raise ValueError("Invalid model version mapping")

        mapping = {
            league: str(version)
            for league, version in model_versions.items()
        }

        with cache.pipeline(transaction=True) as pipe:
            pipe.delete(key)
            pipe.hset(key, mapping=mapping)
            pipe.execute()

    except redis.RedisError as e:
        raise RuntimeError(
            f"Could not save model versions: {e}"
        ) from e

def get_model_versions(cache_version: int):
    key = f"slop-watch:model-versions:{cache_version}"

    try:
        versions = cache.hgetall(key)

        if not versions:
            return None

        return versions

    except redis.RedisError as e:
        raise RuntimeError(
            f"Could not retrieve model versions: {e}"
        ) from e


def get_model_version(cache_version: int, league: str):
    versions = get_model_versions(cache_version)

    if not versions or league not in versions:
        raise RuntimeError(
            f"No model version registered for "
            f"{league} at cache version {cache_version}"
        )

    return versions[league]

def copy_cached(source_key: str, destination_key: str) -> bool:
    try:
        with cache.pipeline(transaction=True) as pipe:
            pipe.dump(source_key)
            pipe.pttl(source_key)

            value, ttl = pipe.execute()

        if value is None or ttl == -2:
            return False

        if ttl == -1:
            ttl = 0

        cache.restore(
            destination_key,
            ttl,
            value,
            replace=True,
        )

        return True

    except redis.RedisError as e:
        print(f"Redis cache copy failed: {e}", flush=True)
        return False