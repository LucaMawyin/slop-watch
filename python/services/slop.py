from games import get_games, get_performance

def get_slop():
    games = get_games()
    performance = get_performance()

    # Full season team performance
    team_stats = performance.groupby("team").agg(
        win_pct=("win", "mean"),
        point_diff_avg=("point_diff", "mean"),
    ).reset_index()

    # ---------------------------------
    # CONVERT PERFORMANCE TO BADNESS
    # ---------------------------------

    # Win %
    team_stats["win_pct_badness"] = (
        1 - team_stats["win_pct"]
    )

    # Point differential
    POINT_DIFF_MIN = -20
    POINT_DIFF_MAX = 20

    normalized = (
        (team_stats["point_diff_avg"] - POINT_DIFF_MIN) /
        (POINT_DIFF_MAX - POINT_DIFF_MIN)
    )

    team_stats["point_diff_badness"] = 1 - normalized.clip(0, 1)

    # ---------------------------------
    # ACTUAL TEAM BADNESS
    # ---------------------------------
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
    # ACTUAL SLOP
    # ---------------------------------

    games["actual_slop"] = (
        games["home_badness"] +
        games["away_badness"]
    ) / 2

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
                "actual_slop",
            ]
        ]
        .head(100)
        .reset_index(drop=True)
        .rename_axis("rank")
        .to_string()
    )

    return games
    