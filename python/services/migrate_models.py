
import joblib
import time

from pathlib import Path
from config.sports import SPORT_CONFIG

models_dir = Path("models")
migrated = 0

for league in SPORT_CONFIG:
    model_path = models_dir / f"{league}_slop_model.pkl"
    distribution_path = models_dir / f"{league}_prediction_distribution.pkl"
    current_path = models_dir / f"{league}_current.pkl"

    print(f"\n{league.upper()}")

    if not model_path.exists() or not distribution_path.exists():
        print("  SKIPPED: Missing legacy model or distribution")
        continue

    if current_path.exists():
        print("  SKIPPED: Current artifact already exists")
        continue

    model = joblib.load(model_path)
    distribution = joblib.load(distribution_path)

    generation = str(time.time_ns())

    artifact = {
        "version": generation,
        "model": model,
        "distribution": distribution,
    }

    temp_path = models_dir / f"{league}_current.tmp"

    try:
        joblib.dump(artifact, temp_path)
        temp_path.replace(current_path)
    except Exception:
        if temp_path.exists():
            temp_path.unlink()
        raise

    print(f"  Created: {current_path}")
    print(f"  Version: {generation}")

    migrated += 1

print(f"\nMigration complete: {migrated} artifacts created.")
