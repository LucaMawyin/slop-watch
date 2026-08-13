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

    # Full season team performance
    team_stats = performance.groupby("team").agg(
        win_pct=("win", "mean"),
        point_diff_avg=("point_diff", "mean"),
    ).reset_index()

    # ---------------------------------
    # TEAM BADNESS
    # ---------------------------------

    team_stats["win_pct_badness"] = (
        1 - team_stats["win_pct"]
    )

    team_stats["point_diff_badness"] = normalize_badness(
        team_stats["point_diff_avg"],
        POINT_DIFF_MIN,
        POINT_DIFF_MAX,
    )

    team_stats["actual_badness"] = (
        team_stats["win_pct_badness"] +
        team_stats["point_diff_badness"]
    ) / 2

    # ---------------------------------
    # ATTACH BADNESS TO GAMES
    # ---------------------------------

    home_badness = team_stats[
        ["team", "actual_badness"]
    ].rename(
        columns={
            "team": "home_name",
            "actual_badness": "home_badness",
        }
    )

    away_badness = team_stats[
        ["team", "actual_badness"]
    ].rename(
        columns={
            "team": "away_name",
            "actual_badness": "away_badness",
        }
    )

    games = games.merge(
        home_badness, 
        on="home_name",
        how="left"
    ).merge(
        away_badness, 
        on="away_name",
        how="left"
    )

    # ---------------------------------
    # TEAM BADNESS COMPONENT
    # ---------------------------------

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

    games["actual_slop"] = (
        0.6 * games["team_badness"] +
        0.4 * games["scoring_badness"]
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
        .head(100)
        .to_string()
    )

    return games
    