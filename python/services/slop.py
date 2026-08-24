import numpy as np
from services.games import get_games, get_performance
from config.sports import SPORT_CONFIG

def normalize_badness(value, min_value, max_value):
    normalized = (
        (value - min_value) /
        (max_value - min_value)
    )

    return 1 - normalized.clip(0, 1)

def get_slop(league="nba"):

    games = get_games(league=league)
    performance = get_performance(league=league)
    config=SPORT_CONFIG[league]

    # ---------------------------------
    # GET PRE-GAME HOME TEAM STATS
    # ---------------------------------

    home_features = performance[
        [
            "game_id",
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

    # ---------------------------------
    # GET PRE-GAME AWAY TEAM STATS
    # ---------------------------------

    away_features = performance[
        [
            "game_id",
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
    # ATTACH PRE-GAME STATS TO GAMES
    # ---------------------------------

    games = games.merge(
        home_features, 
        on=["game_id", "home_name"], 
        how="left"
    ).merge(
        away_features, 
        on=["game_id", "away_name"], 
        how="left"
    )

    # ---------------------------------
    # TEAM BADNESS
    # ---------------------------------

    games["home_win_badness"] = 1 - games["home_win_pct"]
    games["away_win_badness"] = 1 - games["away_win_pct"]

    games["home_point_diff_badness"] = normalize_badness(
        games["home_point_diff"],
        config["point_diff_min"],
        config["point_diff_max"],
    )

    games["away_point_diff_badness"] = normalize_badness(
        games["away_point_diff"],
        config["point_diff_min"],
        config["point_diff_max"],
    )

    games["home_badness"] = (
        games["home_win_badness"] +
        games["home_point_diff_badness"] + 
        (1 - games["home_recent_win_pct"]) +
        normalize_badness(
            games["home_recent_point_diff"],
            config["point_diff_min"],
            config["point_diff_max"],
        )
    ) / 4

    games["away_badness"] = (
        games["away_win_badness"] +
        games["away_point_diff_badness"] + 
        (1 - games["away_recent_win_pct"]) +
        normalize_badness(
            games["away_recent_point_diff"],
            config["point_diff_min"],
            config["point_diff_max"],
        )
    ) / 4

    games["team_badness"] = (
        games["home_badness"] +
        games["away_badness"]
    ) / 2

    # ---------------------------------
    # UNCOMPETITIVENESS
    # ---------------------------------

    games["expected_margin"] = (
        0.6 * (
            games["home_point_diff"] - 
            games["away_point_diff"]
        )
        +
        0.4 * (
            games["home_recent_point_diff"] - 
            games["away_recent_point_diff"]
        )
    )

    games["actual_margin"] = (
        games["home_score"] -
        games["away_score"]
    )

    games["margin_error"] = (
        games["actual_margin"] -
        games["expected_margin"]
    )

    games = games.sort_values("date").reset_index(drop=True)

    games["margin_std"] = (
        games["margin_error"]
        .expanding(min_periods=100)
        .std()
        .shift(1)
    )

    # Normal distribution distance function
    games["uncompetitiveness"] = (
        1 - np.exp(
            -(games["margin_error"] ** 2)
            /
            (2 * games["margin_std"] ** 2)
        )
    )

    # ---------------------------------
    # LOW SCORING
    # ---------------------------------

    games["total_points"] = (
        games["home_score"] +
        games["away_score"]
    )

    games["scoring_badness"] = normalize_badness(
        games["total_points"],
        config["total_points_min"],
        config["total_points_max"],
    )

    # ---------------------------------
    # ACTUAL SLOP
    # ---------------------------------

    games["scoring_weight"] = (
        0.10 + 0.15 * games["team_badness"]
    )

    games["uncompetitiveness_weight"] = (
        0.25 + 0.10 * games["team_badness"]
    )

    games["team_weight"] = (
        1 
        - games["scoring_weight"]
        - games["uncompetitiveness_weight"]
    )

    games["actual_slop"] = (
        games["team_weight"] * 
        games["team_badness"] 
        +
        games["scoring_weight"] * 
        games["scoring_badness"]
        +
        games["uncompetitiveness_weight"] * 
        games["uncompetitiveness"]
    )

    games["slop_percentile"] = (
        games["actual_slop"]
        .expanding(min_periods=100)
        .apply(
            lambda x: (
                (x.iloc[:-1] < x.iloc[-1]).mean()
                if len(x) > 1
                else np.nan
            )
        )
    )

    # Sort games by date and reset index
    games = games.sort_values("date").reset_index(drop=True)

    return games