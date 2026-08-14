import joblib
import pandas as pd

from games import get_future_games, get_performance

MODEL_PATH = "models/slop_model.pkl"


FEATURES = [
    "home_win_pct",
    "away_win_pct",
    "home_point_diff",
    "away_point_diff",
    "home_recent_win_pct",
    "away_recent_win_pct",
    "home_recent_point_diff",
    "away_recent_point_diff",
]

def predict_slop(prediction_date=None):

    if prediction_date is None:
        prediction_date = pd.Timestamp.now(tz="UTC")

    prediction_date = pd.Timestamp(prediction_date)

    if prediction_date.tzinfo is None:
        prediction_date = prediction_date.tz_localize("UTC")
    else:
        prediction_date = prediction_date.tz_convert("UTC")


    model = joblib.load(MODEL_PATH)
    games = get_future_games(
        prediction_date=prediction_date
    )

    performance = get_performance()

    if games.empty:
        print("No NBA games found for the prediction date.")
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

    valid = games[FEATURES].notna().all(axis=1)
    games = games[valid].copy()

    # ---------------------------------
    # PREDICT SLOP
    # ---------------------------------

    games["predicted_slop"] = model.predict(games[FEATURES])

    # ---------------------------------
    # SORT BY SLOP
    # ---------------------------------
    games = games.sort_values("predicted_slop", ascending=False)

    return games

if __name__ == "__main__":
    predictions = predict_slop(
        prediction_date=pd.Timestamp("2026-10-13", tz="UTC")
    )

    if not predictions.empty:
        print(
            predictions[
                [
                    "date",
                    "home_name",
                    "away_name",
                    "predicted_slop",
                ]
            ]
            .head(100)
            .to_string(index=False)
        )