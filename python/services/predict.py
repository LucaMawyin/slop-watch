import time
import joblib
import pandas as pd
import numpy as np

from config.sports import (
    SPORT_CONFIG, 
    MODEL_FEATURES,
)
from services.games import get_games

def predict(start_date=None, days_ahead=100, league="mlb"):

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

        games.loc[is_processed, column] = (
            games.loc[is_processed, "game_id"]
            .map(processed_values[column])
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
            # PREDICT FEATURES
            # ---------------------------------

            model = joblib.load(
                f"models/{league}_slop_model.pkl"
            )

            prediction_distribution = joblib.load(
                f"models/{league}_prediction_distribution.pkl"
            )

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