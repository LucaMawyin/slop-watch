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

    # Add missing actual values for future games
    if "actual_slop" not in games:
        games["actual_slop"] = None

    if "actual_watchability" not in games:
        games["actual_watchability"] = None

    valid = games[MODEL_FEATURES].notna().all(axis=1)

    if not valid.any():
        return games.iloc[0:0].copy()

    games = games[valid].copy()

    # ---------------------------------
    # PREDICT FEATURES
    # ---------------------------------

    model = joblib.load(
        f"models/{league}_slop_model.pkl"
    )

    prediction_distribution = joblib.load(
        f"models/{league}_prediction_distribution.pkl"
    )

    predictions = model.predict(games[MODEL_FEATURES])

    games["predicted_slop"] = predictions [:, 0]
    games["predicted_watchability"] = predictions [:, 1]

    # ---------------------------------
    # SLOP PERCENTILE
    # ---------------------------------

    historical_predicted_slop = prediction_distribution["slop"]

    games["slop_percentile"] = games["predicted_slop"].apply(
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

    games["watchability_percentile"] = games["predicted_watchability"].apply(
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
        "predicted_slop", 
        ascending=False
    )

    elapsed = time.perf_counter() - start_time
    print(f"Predict took {elapsed:.3f}s")

    return games

if __name__ == "__main__":
    predictions = predict(
    )