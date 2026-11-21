import time
import joblib
import pandas as pd
import numpy as np

from pathlib import Path

from config.sports import (
    SPORT_CONFIG, 
    MODEL_FEATURES,
)
from services.games import get_games

def predict(
    start_date=None, 
    days_ahead=100, 
    league="mlb",
    model_version=None,
):

    start_time = time.perf_counter()

    # Default to today
    if start_date is None:
        start_date = pd.Timestamp.now("UTC")
    else:
        start_date = pd.Timestamp(start_date)

        if start_date.tzinfo is None:
            start_date = start_date.tz_localize("UTC")
        else:
            start_date = start_date.tz_convert("UTC")

    start_date = start_date.normalize()

    # ---------------------------------
    # GET GAMES IN DATE RANGE
    # ---------------------------------

    games = get_games(
        start_date=start_date,
        days_ahead=days_ahead,
        league=league
    )

    # Return if no games
    if games.empty:
        print(f"Predict took {time.perf_counter() - start_time:.3f}s")
        return games

    # ---------------------------------
    # LOAD PROCESSED DATA
    # ---------------------------------

    processed = pd.read_csv(
        SPORT_CONFIG[league]["processed_output"]
    )

    processed["game_id"] = (
        processed["game_id"]
        .astype(str)
        .str.strip()
    )

    games["game_id"] = (
        games["game_id"]
        .astype(str)
        .str.strip()
    )

    games["slop_percentile"] = np.nan
    games["watchability_percentile"] = np.nan
    games["predicted_slop"] = np.nan
    games["predicted_watchability"] = np.nan

    # ---------------------------------
    # IDENTIFY PROCESSED GAMES
    # ---------------------------------

    processed_ids = set(
        processed["game_id"]
    )

    is_processed = games["game_id"].isin(
        processed_ids
    )

    is_missing = ~is_processed

    # ---------------------------------
    # GET STORED VALUES
    # ---------------------------------

    processed_values = processed[
        [
            "game_id",
            "actual_slop",
            "actual_watchability",
            "slop_percentile",
            "watchability_percentile",
        ]
    ].copy()

    processed_values = processed_values.drop_duplicates(
        subset="game_id",
        keep="last"
    )

    processed_values = processed_values.set_index(
        "game_id"
    )

    # Only fill values from processed data
    for column in [
        "actual_slop",
        "actual_watchability",
        "slop_percentile",
        "watchability_percentile",
    ]:

        if column not in games.columns:
            games[column] = np.nan

        if is_processed.any():
            values = (
                games.loc[is_processed, "game_id"]
                .map(processed_values[column])
            )

            games[column] = games[column].astype("float64")

            games.loc[is_processed, column] = pd.to_numeric(
                values,
                errors="coerce"
            )

    # ---------------------------------
    # PREDICT MISSING GAMES
    # ---------------------------------

    if is_missing.any():

        valid = (
            games.loc[is_missing, MODEL_FEATURES]
            .notna()
            .all(axis=1)
        )

        missing_indices = games.loc[
            is_missing
        ].index

        valid_indices = missing_indices[valid]

        if len(valid_indices) > 0:

            # ---------------------------------
            # LOAD MODEL ARTIFACT
            # ---------------------------------

            models_dir = Path("models")

            if model_version is None:
                # Standalone use: default to the current model.
                artifact_paths = [
                    models_dir / f"{league}_current.pkl",
                ]
            else:
                # Production: find the exact registered model generation.
                artifact_paths = [
                    models_dir / f"{league}_candidate.pkl",
                    models_dir / f"{league}_current.pkl",
                    models_dir / f"{league}_previous.pkl",
                ]

            artifact = None

            for artifact_path in artifact_paths:

                if not artifact_path.exists():
                    continue

                candidate_artifact = joblib.load(artifact_path)

                if (
                    model_version is None
                    or candidate_artifact["version"] == str(model_version)
                ):
                    artifact = candidate_artifact
                    break

            if artifact is None:
                raise FileNotFoundError(
                    f"No model artifact found for "
                    f"{league} version {model_version}"
                )

            model = artifact["model"]
            prediction_distribution = artifact["distribution"]

            print(
                f"{league.upper()} model version: {artifact['version']}",
                flush=True,
            )

            # ---------------------------------
            # DEBUG GAME
            # ---------------------------------

            debug_game = games.loc[
                valid_indices[
                    games.loc[valid_indices, "game_id"] == "401882799"
                ]
            ]

            if not debug_game.empty:
                print("\n========== MODEL INPUT DEBUG ==========")
                print(
                    debug_game[
                        ["game_id"] + MODEL_FEATURES
                    ].to_string(index=False)
                )
                print("=======================================\n")

            # ---------------------------------
            # PREDICTIONS
            # ---------------------------------


            predictions = model.predict(
                games.loc[
                    valid_indices,
                    MODEL_FEATURES
                ]
            )

            games.loc[
                valid_indices,
                "predicted_slop"
            ] = predictions[:, 0]

            games.loc[
                valid_indices,
                "predicted_watchability"
            ] = predictions[:, 1]

            # ---------------------------------
            # SLOP PERCENTILE
            # ---------------------------------

            historical_predicted_slop = prediction_distribution["slop"]

            games.loc[
                valid_indices,
                "slop_percentile"
            ] = games.loc[
                valid_indices, 
                "predicted_slop"
            ].apply(
                lambda score: (
                    (historical_predicted_slop < score).mean()
                    if len(historical_predicted_slop) > 0
                    else np.nan
                )
            )

            # ---------------------------------
            # WATCHABILITY PERCENTILE
            # ---------------------------------

            historical_predicted_watchability = prediction_distribution["watchability"]

            games.loc[
                valid_indices, 
                "watchability_percentile"
            ] = games.loc[
                valid_indices, 
                "predicted_watchability"
            ].apply(
                lambda score: (
                    (historical_predicted_watchability < score).mean()
                    if len(historical_predicted_watchability) > 0
                    else np.nan
                )
            )

    # ---------------------------------
    # SORT BY SLOP
    # ---------------------------------

    games = games.sort_values(
        "slop_percentile", 
        ascending=False
    )

    elapsed = time.perf_counter() - start_time
    print(f"Predict took {elapsed:.3f}s")

    return games

if __name__ == "__main__":
    predictions = predict(
    )