import numpy as np
import pandas as pd

from config.sports import SPORT_CONFIG

def get_last_team_games(
    processed,
    home_name,
    away_name,
    game_date,
):

    game_date = pd.Timestamp(game_date).normalize()

    completed = processed[
        (processed["date"] < game_date) &
        (processed["actual_slop"].notna())
    ].copy()

    home_games = completed[
        (completed["home_name"] == home_name) |
        (completed["away_name"] == home_name)
    ].sort_values(
        "date",
        ascending=False
    )

    away_games = completed[
        (completed["home_name"] == away_name) |
        (completed["away_name"] == away_name)
    ].sort_values(
        "date",
        ascending=False
    )

    home_last = (
        home_games.iloc[0]
        if not home_games.empty
        else None
    )

    away_last = (
        away_games.iloc[0]
        if not away_games.empty
        else None
    )

    return home_last, away_last

def get_team_badness(game, team_name):
    if game is None:
        return None

    if game["home_name"] == team_name:
        return game["home_badness"]

    return game["away_badness"]

def get_live_metrics(
    league,
    home_name,
    away_name,
    game_date,
    home_score,
    away_score,
    is_postseason=False,
    playoff_wins=0,
):
    processed = pd.read_csv(
        SPORT_CONFIG[league]["processed_output"]
    )

    processed["date"] = (
        pd.to_datetime(processed["date"])
        .dt.normalize()
    )

    home_last, away_last = get_last_team_games(
        processed=processed,
        home_name=home_name,
        away_name=away_name,
        game_date=game_date,
    )

    home_badness = get_team_badness(
        home_last,
        home_name,
    )

    away_badness = get_team_badness(
        away_last,
        away_name,
    )

    historical = processed[
        processed["actual_slop"].notna()
    ]

    scoring_distribution = (
        historical["total_points"]
        .dropna()
        .to_numpy()
    )

    competitiveness_distribution = (
        historical["actual_margin"]
        .dropna()
        .to_numpy()
    )

    slop_distribution = (
        historical["actual_slop"]
        .dropna()
        .to_numpy()
    )

    watchability_distribution = (
        historical["actual_watchability"]
        .dropna()
        .to_numpy()
    )

    scoring_mean = scoring_distribution.mean()
    scoring_std = scoring_distribution.std()

    return calculate_live_metrics(
        home_score=home_score,
        away_score=away_score,
        home_badness=home_badness,
        away_badness=away_badness,
        scoring_mean=scoring_mean,
        scoring_std=scoring_std,
        competitiveness_distribution=competitiveness_distribution,
        scoring_distribution=scoring_distribution,
        slop_distribution=slop_distribution,
        watchability_distribution=watchability_distribution,
        is_postseason=is_postseason,
        playoff_wins=playoff_wins,
    )

def calculate_live_metrics(
    *,
    home_score,
    away_score,
    home_badness,
    away_badness,
    scoring_mean,
    scoring_std,
    competitiveness_distribution,
    scoring_distribution,
    slop_distribution,
    watchability_distribution,
    is_postseason=False,
    playoff_wins=0,
):
    if home_score is None or away_score is None:
        return {
            "live_slop": None,
            "live_watchability": None,
        }

    home_score = float(home_score)
    away_score = float(away_score)

    # ---------------------------------
    # TEAM BADNESS
    # ---------------------------------

    team_badness = (
        home_badness +
        away_badness
    ) / 2

    team_quality = (
        1 -
        min(home_badness, away_badness)
    )

    # ---------------------------------
    # SCORE
    # ---------------------------------

    total_points = (
        home_score +
        away_score
    )

    actual_margin = abs(
        home_score -
        away_score
    )

    # ---------------------------------
    # SCORING BADNESS
    # ---------------------------------

    scoring_std = max(
        float(scoring_std),
        1e-6
    )

    ideal_scoring = (
        scoring_mean +
        0.25 * scoring_std
    )

    scoring_badness = (
        1 -
        np.exp(
            -(
                total_points -
                ideal_scoring
            ) ** 2
            /
            (
                2 *
                scoring_std ** 2
            )
        )
    )

    # ---------------------------------
    # COMPETITIVENESS
    # ---------------------------------

    competitiveness = (
        np.asarray(
            competitiveness_distribution
        ) >= actual_margin
    ).mean()

    uncompetitiveness = (
        1 -
        competitiveness
    )

    # ---------------------------------
    # SCORING ENTERTAINMENT
    # ---------------------------------

    scoring_entertainment = (
        np.asarray(
            scoring_distribution
        ) < total_points
    ).mean()

    # ---------------------------------
    # WATCHABILITY WEIGHTS
    # ---------------------------------

    team_quality_weight = (
        0.15 +
        0.20 * uncompetitiveness
    )

    remaining_weight = (
        1 -
        team_quality_weight
    )

    competitiveness_weight = (
        remaining_weight *
        (
            0.10 +
            0.50 * team_quality
        )
    )

    scoring_weight = (
        remaining_weight -
        competitiveness_weight
    )

    weight_sum = (
        competitiveness_weight +
        scoring_weight +
        team_quality_weight
    )

    competitiveness_weight /= weight_sum
    scoring_weight /= weight_sum
    team_quality_weight /= weight_sum

    # ---------------------------------
    # WATCHABILITY
    # ---------------------------------

    playoff_boost = (
        0.01 * playoff_wins
        if is_postseason
        else 0
    )

    live_watchability = (
        competitiveness_weight *
        competitiveness
        +
        scoring_weight *
        scoring_entertainment
        +
        team_quality_weight *
        team_quality
        +
        playoff_boost
    )

    live_watchability = float(
        np.clip(
            live_watchability,
            0,
            1
        )
    )

    # ---------------------------------
    # SLOP
    # ---------------------------------

    scoring_weight = (
        0.10 +
        0.15 * team_badness
    )

    uncompetitiveness_weight = (
        0.25 +
        0.10 * team_badness
    )

    team_weight = (
        1 -
        scoring_weight -
        uncompetitiveness_weight
    )

    live_slop = (
        team_weight *
        team_badness
        +
        scoring_weight *
        scoring_badness
        +
        uncompetitiveness_weight *
        uncompetitiveness
    )

    live_slop = float(
        np.clip(
            live_slop,
            0,
            1
        )
    )

    live_slop_percentile = (
        (slop_distribution < live_slop).mean()
        if len(slop_distribution) > 0
        else np.nan
    )

    live_watchability_percentile = (
        (watchability_distribution < live_watchability).mean()
        if len(watchability_distribution) > 0
        else np.nan
    )

    return {
        "live_slop": live_slop_percentile,
        "live_watchability": live_watchability_percentile,
    }

def get_live_score(
    league,
    game_id,
    game_date,
):
    config = SPORT_CONFIG[league]
    schedule_function = config["schedule_function"]

    game_date = pd.Timestamp(game_date)

    # ---------------------------------
    # PWHL
    # ---------------------------------

    if league == "pwhl":

        games = schedule_function(
            season=game_date.year,
            return_as_pandas=True
        )

    # ---------------------------------
    # SOCCER
    # ---------------------------------

    elif "league" in config:

        games = schedule_function(
            league=config["league"],
            dates=game_date.strftime("%Y%m%d"),
            return_as_pandas=True,
            limit=500
        )

        if games is not None and not games.empty:
            games = games.rename(columns={
                "event_id": "game_id",
            })

    # ---------------------------------
    # ESPN
    # ---------------------------------

    else:

        games = schedule_function(
            dates=game_date.strftime("%Y%m%d"),
            return_as_pandas=True,
            limit=50
        )

    if games is None or games.empty:
        return {
            "home_score": None,
            "away_score": None,
        }

    games["game_id"] = (
        games["game_id"]
        .astype(str)
        .str.strip()
    )

    game = games[
        games["game_id"] == str(game_id)
    ]

    if game.empty:
        return {
            "home_score": None,
            "away_score": None,
        }

    game = game.iloc[0]

    home_score = game.get("home_score")
    away_score = game.get("away_score")

    if pd.isna(home_score):
        home_score = None
    else:
        home_score = float(home_score)

    if pd.isna(away_score):
        away_score = None
    else:
        away_score = float(away_score)

    return {
        "home_score": home_score,
        "away_score": away_score,
    }