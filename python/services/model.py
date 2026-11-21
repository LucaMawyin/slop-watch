import joblib
from pathlib import Path
import os
import time
import shutil

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

from services.slop import get_slop
from config.sports import SPORT_CONFIG, MODEL_FEATURES

def train_model(league="nba"):

    actual_slop = get_slop(league=league)

    # ---------------------------------
    # SORT DATA BY DATE
    # ---------------------------------

    actual_slop = actual_slop.sort_values("date").reset_index(drop=True)

    # ---------------------------------
    # FEATURES
    # ---------------------------------

    targets = [
        "actual_slop",
        "actual_watchability",
    ]

    X = actual_slop[MODEL_FEATURES]
    Y = actual_slop[targets]

    # Remove games where pre-game statistics are unavailable
    valid = (
        X.notna().all(axis=1) &
        Y.notna().all(axis=1)
    )

    X = X[valid].reset_index(drop=True)
    Y = Y[valid].reset_index(drop=True)

    # ---------------------------------
    # TRAIN / TEST SPLIT
    # ---------------------------------

    split_index = int(len(X) * 0.8)
    X_train = X.iloc[:split_index]
    Y_train = Y.iloc[:split_index]

    X_test = X.iloc[split_index:]
    Y_test = Y.iloc[split_index:]

    # ---------------------------------
    # TRAIN MODEL
    # ---------------------------------
    model = RandomForestRegressor(
        n_estimators=200, 
        random_state=42,
    )

    model.fit(
        X_train, 
        Y_train,
    )

    # ---------------------------------
    # TEST MODEL
    # ---------------------------------
    predictions = model.predict(X_test)

    all_predictions = model.predict(X)

    # Save the distribution of historical model predictions
    prediction_distribution = {
        "slop": all_predictions[:, 0],
        "watchability": all_predictions[:, 1],
    }

    slop_error = mean_absolute_error(
        Y_test["actual_slop"],
        predictions[:, 0],
    )

    watchability_error = mean_absolute_error(
        Y_test["actual_watchability"],
        predictions[:, 1],
    )

    print(
        f"Slop MAE: {slop_error:.4f}"
    )

    print(
        f"Watchability MAE: {watchability_error:.4f}"
    )

    # ---------------------------------
    # SAVE CANDIDATE MODEL ARTIFACT
    # ---------------------------------

    generation = str(time.time_ns())

    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)

    candidate_path = models_dir / f"{league}_candidate.pkl"
    temp_path = models_dir / f"{league}_candidate.tmp"

    artifact = {
        "version": generation,
        "model": model,
        "distribution": prediction_distribution,
    }

    try:
        joblib.dump(artifact, temp_path)
        os.replace(temp_path, candidate_path)

    except Exception:
        if temp_path.exists():
            temp_path.unlink()

        raise

    print(
        f"{league.upper()} candidate model saved. Version: {generation}"
    )

    return generation

def promote_model(league: str, expected_version: str):

    models_dir = Path("models")

    candidate_path = models_dir / f"{league}_candidate.pkl"
    current_path = models_dir / f"{league}_current.pkl"
    previous_path = models_dir / f"{league}_previous.pkl"
    previous_temp = models_dir / f"{league}_previous.tmp"

    expected_version = str(expected_version)

    # ---------------------------------
    # CHECK IF ALREADY PROMOTED
    # ---------------------------------

    if current_path.exists():
        current = joblib.load(current_path)

        if current["version"] == expected_version:
            print(
                f"{league.upper()} model already promoted: {expected_version}",
                flush=True,
            )
            return

    # ---------------------------------
    # VALIDATE CANDIDATE
    # ---------------------------------

    if not candidate_path.exists():
        raise FileNotFoundError(
            f"Candidate model not found: {candidate_path}"
        )

    candidate = joblib.load(candidate_path)

    if candidate["version"] != expected_version:
        raise RuntimeError(
            f"Candidate version mismatch for {league}. "
            f"Expected {expected_version}, "
            f"found {candidate['version']}"
        )

    # ---------------------------------
    # PRESERVE CURRENT MODEL
    # ---------------------------------

    try:
        if current_path.exists():

            shutil.copy2(
                current_path,
                previous_temp,
            )

            os.replace(
                previous_temp,
                previous_path,
            )

        # ---------------------------------
        # PROMOTE CANDIDATE
        # ---------------------------------

        os.replace(
            candidate_path,
            current_path,
        )

        print(
            f"{league.upper()} model promoted: {expected_version}",
            flush=True,
        )

    except Exception:
        if previous_temp.exists():
            previous_temp.unlink()

        raise

def discard_model_candidate(league: str, expected_version: str):

    candidate_path = Path("models") / f"{league}_candidate.pkl"

    if not candidate_path.exists():
        return

    candidate = joblib.load(candidate_path)

    if candidate["version"] == str(expected_version):
        candidate_path.unlink()

        print(
            f"{league.upper()} candidate discarded: {expected_version}",
            flush=True,
        )

def promote_all_models(model_versions: dict):

    for league, generation in model_versions.items():
        promote_model(league, generation)


def discard_model_candidates(model_versions: dict):

    for league, generation in model_versions.items():
        discard_model_candidate(league, generation)

if __name__ == "__main__":
    for league in SPORT_CONFIG:
        print(f"\nTraining {league.upper()} model...")
        train_model(league=league)