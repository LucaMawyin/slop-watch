from games import get_games, get_performance

POINT_DIFF_MIN = -20
POINT_DIFF_MAX = 20

TOTAL_POINTS_MIN = 180
TOTAL_POINTS_MAX = 260


def normalize_badness(value, min_value, max_value):
    normalized = (
        (value - min_value) /
        (max_value - min_value)
    )

    return 1 - normalized.clip(0, 1)

def get_slop():

    games = get_games()
    performance = get_performance()

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
        POINT_DIFF_MIN,
        POINT_DIFF_MAX,
    )

    games["away_point_diff_badness"] = normalize_badness(
        games["away_point_diff"],
        POINT_DIFF_MIN,
        POINT_DIFF_MAX,
    )

    games["home_badness"] = (
        games["home_win_badness"] +
        games["home_point_diff_badness"] + 
        (1 - games["home_recent_win_pct"]) +
        normalize_badness(
            games["home_recent_point_diff"],
            POINT_DIFF_MIN,
            POINT_DIFF_MAX
        )
    ) / 4

    games["away_badness"] = (
        games["away_win_badness"] +
        games["away_point_diff_badness"] + 
        (1 - games["away_recent_win_pct"]) +
        normalize_badness(
            games["away_recent_point_diff"],
            POINT_DIFF_MIN,
            POINT_DIFF_MAX
        )
    ) / 4

    games["team_badness"] = (
        games["home_badness"] +
        games["away_badness"]
    ) / 2

    # ---------------------------------
    # ACTUAL GAME SCORING
    # ---------------------------------

    games["total_points"] = (
        games["home_score"] +
        games["away_score"]
    )

    games["scoring_badness"] = normalize_badness(
        games["total_points"],
        TOTAL_POINTS_MIN,
        TOTAL_POINTS_MAX,
    )

    # ---------------------------------
    # ACTUAL SLOP
    # ---------------------------------

    games["scoring_weight"] = (
        0.1 + 0.2 * games["team_badness"]
    )

    games["team_weight"] = (
        1 - games["scoring_weight"]
    )

    games["actual_slop"] = (
        games["team_weight"] * games["team_badness"] +
        games["scoring_weight"] * games["scoring_badness"]
    )

    # Sort games by date and reset index
    games = games.sort_values("date").reset_index(drop=True)

    print(
        games[
            [
                "date",
                "home_name",
                "away_name",
                "home_badness",
                "away_badness",
                "team_badness",
                "total_points",
                "scoring_badness",
                "actual_slop",
            ]
        ]
        .sort_values("actual_slop", ascending=False)
        .head(100)
        .to_string()
    )

    return games