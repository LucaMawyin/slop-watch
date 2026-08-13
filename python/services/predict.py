import pandas as pd
from games import get_games, get_performance

# Function to normalize badness values between 0 and 1
POINT_DIFF_MIN = -20
POINT_DIFF_MAX = 20
def normalize_badness(series, min_value, max_value):
    normalized = (
        (series - min_value) /
        (max_value - min_value)
    )

    return 1 - normalized.clip(0, 1)

def predict_slop():
    games = get_games()
    performance = get_performance()

    # ---------------------------------
    # CONVERT FEATURES TO BADNESS
    # ---------------------------------

    # Badness of win percentage
    performance["win_pct_badness"] = (
        1 - performance["win_pct"]
    )

    # Badness of recent win percentage
    performance["recent_win_pct_badness"] = (
        1 - performance["recent_win_pct"]
    )

    # Badness of point diff
    performance["point_diff_badness"] = normalize_badness(
        performance["point_diff_avg"],
        POINT_DIFF_MIN,
        POINT_DIFF_MAX
    )

    # Badness of recent point diff
    performance["recent_point_diff_badness"] = normalize_badness(
        performance["recent_point_diff"],
        POINT_DIFF_MIN,
        POINT_DIFF_MAX
    )

    # ---------------------------------
    # PREDICTED TEAM BADNESS
    # ---------------------------------

    # Team badness
    performance["predicted_badness"] = (
        performance["win_pct_badness"]
        + performance["point_diff_badness"]
        + performance["recent_win_pct_badness"]
        + performance["recent_point_diff_badness"]
    ) / 4

    # ---------------------------------
    # ATTACH PREDICTED BADNESS TO GAMES
    # ---------------------------------

    home_badness = performance[
        ["game_id", "team", "predicted_badness"]
    ].rename(
        columns={
            "team": "home_name", 
            "badness": "predicted_home_badness",
        }
    )

    away_badness = performance[
        ["game_id", "team", "predicted_badness"]
    ].rename(
        columns={
            "team": "away_name", 
            "badness": "predicted_away_badness",
        }
    )

    games = games.merge(
        home_badness, 
        on=["game_id", "home_name"], 
        how="left"
    ).merge(
        away_badness, 
        on=["game_id", "away_name"], 
        how="left"
    )

    # ---------------------------------
    # PREDICTED SLOP
    # ---------------------------------

    games["predicted_slop_score"] = (
        games["predicted_home_badness"] +
        games["predicted_away_badness"]
    ) / 2

    # Sort games by date and reset index
    games = games.sort_values(
        "date"
    ).reset_index(drop=True)

    print(
        games[
            [
                "date",
                "home_name",
                "away_name",
                "predicted_home_badness",
                "predicted_away_badness",
                "predicted_slop_score",
            ]
        ]
        .head(100)
        .reset_index(drop=True)
        .rename_axis("rank")
        .to_string()
    )

    return games