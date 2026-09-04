import joblib
import pandas as pd
import numpy as np

from services.games import get_future_games, get_performance
from services.slop import get_slop
from config.sports import MODEL_FEATURES

import time

def predict_slop(prediction_date=None, league="mlb", days_ahead=100):

    start_time = time.perf_counter()

    if prediction_date is None:
        prediction_date = pd.Timestamp.now(tz="UTC")

    prediction_date = pd.Timestamp(prediction_date)

    if prediction_date.tzinfo is None:
        prediction_date = prediction_date.tz_localize("UTC")
    else:
        prediction_date = prediction_date.tz_convert("UTC")

    # Start from the beginning of the given day
    prediction_date = prediction_date.normalize()

    model = joblib.load(
        f"models/{league}_slop_model.pkl"
    )

    prediction_distribution = joblib.load(
        f"models/{league}_prediction_distribution.pkl"
    )

    games = get_future_games(
        prediction_date=prediction_date,
        days_ahead=days_ahead,
        league=league,
    )

    performance = get_performance(
        league=league,
    )

    if games.empty:
        return games

    # Only use performance available before prediction date
    performance = performance[
        performance["date"] < prediction_date
    ]

    # ---------------------------------
    # GET LATEST TEAM PERFORMANCE
    # ---------------------------------
    latest_performance = (
        performance
        .sort_values("date")
        .groupby("team")
        .tail(1)
    )

    home_features = latest_performance[
        [
            "team",
            "win_pct",
            "point_diff_avg",
            "recent_win_pct",
            "recent_point_diff",            
        ]
    ].rename(
        columns={
            "team": "home_name",
            "win_pct": "home_win_pct",
            "point_diff_avg": "home_point_diff",
            "recent_win_pct": "home_recent_win_pct",
            "recent_point_diff": "home_recent_point_diff",
        }
    )

    away_features = latest_performance[
        [
            "team",
            "win_pct",
            "point_diff_avg",
            "recent_win_pct",
            "recent_point_diff",            
        ]
    ].rename(
        columns={
            "team": "away_name",
            "win_pct": "away_win_pct",
            "point_diff_avg": "away_point_diff",
            "recent_win_pct": "away_recent_win_pct",
            "recent_point_diff": "away_recent_point_diff",
        }
    )

    # ---------------------------------
    # ATTACH TEAM PERFORMANCE
    # ---------------------------------

    games = games.merge(
        home_features,
        on=["home_name"],
        how="left",
    ).merge(
        away_features,
        on=["away_name"],
        how="left",
    )

    valid = games[MODEL_FEATURES].notna().all(axis=1)
    if not valid.any():
        return games.iloc[0:0].copy()

    games = games[valid].copy()

    # ---------------------------------
    # PREDICT SLOP
    # ---------------------------------

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
    predictions = predict_slop(
    )