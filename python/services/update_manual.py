from services.update_data import update_all_models, update_all_data
from services.cache import set_model_versions

from app import (
    generate_data_version,
    warm_cache,
    set_data_version,
)

from lock import lock

from services.update_data import (
    update_all_models,
    update_all_data,
)

from services.model import (
    promote_all_models
)

if __name__ == "__main__":

    # Update data and train candidate models
    update_all_data()
    model_versions = update_all_models()

    if not model_versions:
        raise RuntimeError("No candidate model versions were generated.")

    # Generate candidate version
    candidate_version = generate_data_version()

    # Register model versions against candidate data version
    set_model_versions(candidate_version, model_versions)

    # Warm candidate cache
    if not warm_cache(candidate_version):
        raise RuntimeError(
            "Cache warming failed. Previous version remains active."
        )

    # Promote candidate models, then activate candidate data
    promote_all_models(model_versions)

    with lock:
        set_data_version(candidate_version)

    print(
        f"Successfully updated data and models. "
        f"Version: {candidate_version}"
    )