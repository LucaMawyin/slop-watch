from services.update_data import update_all_models, update_all_data

from app import (
    lock,
    generate_data_version,
    warm_cache,
    set_data_version,
)


if __name__ == "__main__":

    # Update data and models
    update_all_data()
    update_all_models()

    # Generate candidate version
    candidate_version = generate_data_version()

    # Warm candidate cache
    if not warm_cache(candidate_version):
        raise RuntimeError(
            "Cache warming failed. Previous version remains active."
        )

    # Activate candidate version
    with lock:
        set_data_version(candidate_version)

    print(
        f"Successfully updated data and models. "
        f"Version: {candidate_version}"
    )