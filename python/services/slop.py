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
    # PRE-GAME TEAM STATS
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
    # PLAYOFF EXPERIENCE
    # ---------------------------------

    games = games.sort_values("date").reset_index(drop=True)

    team_playoff_wins = {}

    home_playoff_wins = []
    away_playoff_wins = []

    current_season = None

    for _, game in games.iterrows():

        season = game["year"]

        if season != current_season:
            team_playoff_wins = {}
            current_season = season

        home = game["home_name"]
        away = game["away_name"]

        home_wins = team_playoff_wins.get(home, 0)
        away_wins = team_playoff_wins.get(away, 0)

        home_playoff_wins.append(home_wins)
        away_playoff_wins.append(away_wins)

        if game["is_postseason"] == 1:

            if game["home_score"] > game["away_score"]:
                team_playoff_wins[home] = home_wins + 1

            elif game["away_score"] > game["home_score"]:
                team_playoff_wins[away] = away_wins + 1

    games["home_playoff_wins"] = home_playoff_wins
    games["away_playoff_wins"] = away_playoff_wins

    games["playoff_wins"] = (
        games["home_playoff_wins"]
        .combine(
            games["away_playoff_wins"],
            np.maximum
        )
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

    games["actual_margin"] = (
        games["home_score"] -
        games["away_score"]
    ).abs()

    games["uncompetitiveness"] = (
        (games["actual_margin"] / config["margin_max"])
        .clip(0, 1)
        ** 1.5
    )

    # ---------------------------------
    # SCORING BADNESS
    # ---------------------------------

    games["total_points"] = (
        games["home_score"] +
        games["away_score"]
    )

    games["scoring_mean"] = (
        games["total_points"]
        .shift(1)
        .expanding(min_periods=30)
        .mean()
    )

    games["scoring_std"] = (
        games["total_points"]
        .shift(1)
        .expanding(min_periods=30)
        .std()
    )

    games["scoring_std"] = games["scoring_std"].clip(lower=1e-6)

    SCORING_IDEAL_OFFSET = 0.25

    games["ideal_scoring"] = (
        games["scoring_mean"] +
        SCORING_IDEAL_OFFSET * games["scoring_std"]
    )

    games["scoring_badness"] = (
        1 - np.exp(
            -(
                (
                    games["total_points"] -
                    games["ideal_scoring"]
                ) ** 2
            ) /
            (
                2 *
                games["scoring_std"].pow(2)
            )
        )
    )

    # ---------------------------------
    # ACTUAL WATCHABILITY
    # ---------------------------------

    games["team_quality"] = 1 - games["team_badness"]

    games["competitiveness"] = (
        1 -
        (
            games["actual_margin"] /
            games["total_points"].clip(lower=1)
        ) ** 0.75
    ).clip(0, 1)

    games["scoring_entertainment"] = (
        games["total_points"]
        .expanding(min_periods=30)
        .apply(
            lambda x: (
                (x.iloc[:-1] < x.iloc[-1]).mean()
                if len(x) > 1
                else np.nan
            )
        )
    )

    # ---------------------------------
    # DYNAMIC WATCHABILITY WEIGHTING
    # ---------------------------------

    # Team quality matters more when the game is uncompetitive.
    games["team_quality_weight"] = (
        0.15 +
        0.20 * (1 - games["competitiveness"])
    )

    # Whatever remains goes to competitiveness + scoring.
    remaining_weight = 1 - games["team_quality_weight"]

    # Good teams -> competitiveness matters more.
    games["competitiveness_weight"] = (
        remaining_weight *
        (
            0.10 +
            0.50 * games["team_quality"]
        )
    )

    # Bad teams -> scoring matters more.
    games["scoring_weight"] = (
        remaining_weight -
        games["competitiveness_weight"]
    )

    # Normalize weights so they always sum to 1
    weight_sum = (
        games["competitiveness_weight"] +
        games["scoring_weight"] +
        games["team_quality_weight"]
    )

    games["competitiveness_weight"] /= weight_sum
    games["scoring_weight"] /= weight_sum
    games["team_quality_weight"] /= weight_sum

    playoff_watchability_boost = np.where(
        games["is_postseason"] == 1,
        0.01 * games["playoff_wins"],
        0.0
    )

    games["actual_watchability"] = (
        games["competitiveness_weight"] * games["competitiveness"] +
        games["scoring_weight"] * games["scoring_entertainment"] +
        games["team_quality_weight"] * games["team_quality"] +
        playoff_watchability_boost
    ).clip(0, 1)
    print(
        games.loc[
            (
                (games["total_points"] == 9) & (games["actual_margin"] == 3)
            ) |
            (
                (games["total_points"] == 33) & (games["actual_margin"] == 29)
            ) |
            (
                (games["total_points"] == 34) & (games["actual_margin"] == 22)
            ),
            [
                "total_points",
                "actual_margin",
                "competitiveness",
                "scoring_entertainment",
                "team_quality",
                "competitiveness_weight",
                "scoring_weight",
                "team_quality_weight",
                "actual_watchability"
            ]
        ]
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

    # ---------------------------------
    # PERCENTILES
    # ---------------------------------

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

    games["watchability_percentile"] = (
        games["actual_watchability"]
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