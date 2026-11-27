from config.sports import SPORT_CONFIG, DATA_RANGE_YEARS
from pathlib import Path
import pandas as pd
import numpy as np
from datetime import date, timedelta
import os
import warnings
from pandas.errors import DtypeWarning

from services.process_league import process_league
from services.model import train_model
from services.dataset import get_dataset_paths

warnings.filterwarnings("ignore", category=DtypeWarning)

previous_game_days = 10

def normalize_comparison_value(value):

    if isinstance(value, np.ndarray):
        return tuple(
            normalize_comparison_value(v)
            for v in value.tolist()
        )

    if isinstance(value, (list, tuple)):
        return tuple(
            normalize_comparison_value(v)
            for v in value
        )

    if isinstance(value, dict):
        return tuple(
            sorted(
                (
                    str(k),
                    normalize_comparison_value(v)
                )
                for k, v in value.items()
            )
        )

    if isinstance(value, np.generic):
        value = value.item()

    if value is None or value is pd.NA:
        return None

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    return value

def get_change_report(league, old_df, new_df):

    ignored_columns = {"month", "day", "year", "game_id"}

    compare_columns = sorted(
        (set(old_df.columns) & set(new_df.columns))
        - ignored_columns
    )

    old = old_df.copy()
    new = new_df.copy()

    old["game_id"] = (
        pd.to_numeric(old["game_id"], errors="raise")
        .astype("Int64")
        .astype(str)
    )

    new["game_id"] = (
        pd.to_numeric(new["game_id"], errors="raise")
        .astype("Int64")
        .astype(str)
    )

    old["date"] = pd.to_datetime(
        old["date"],
        utc=True,
        errors="coerce",
    )

    new["date"] = pd.to_datetime(
        new["date"],
        utc=True,
        errors="coerce",
    )

    old = old.drop_duplicates("game_id", keep="last")
    new = new.drop_duplicates("game_id", keep="last")

    old = old.set_index("game_id")[compare_columns]
    new = new.set_index("game_id")[compare_columns]

    old_ids = set(old.index)
    new_ids = set(new.index)

    added = new_ids - old_ids
    removed = old_ids - new_ids
    common = old_ids & new_ids

    old_common = old.loc[sorted(common)]
    new_common = new.loc[sorted(common)]

    modified = set()

    for game_id in common:

        old_values = old_common.loc[game_id].tolist()
        new_values = new_common.loc[game_id].tolist()

        changed = any(
            normalize_comparison_value(old_value)
            != normalize_comparison_value(new_value)
            for old_value, new_value in zip(
                old_values,
                new_values,
            )
        )

        if changed:
            modified.add(game_id)

    changed_ids = added | removed | modified

    affected_old = old_df[
        old_df["game_id"].astype(str).isin(changed_ids)
    ]

    affected_new = new_df[
        new_df["game_id"].astype(str).isin(changed_ids)
    ]

    affected = pd.concat(
        [affected_old, affected_new],
        ignore_index=True,
    )

    affected["date"] = pd.to_datetime(
        affected["date"],
        utc=True,
        errors="coerce",
    )

    earliest_date = affected["date"].min()

    teams = set()

    for column in ["home_name", "away_name"]:
        if column in affected.columns:
            teams.update(
                affected[column].dropna().astype(str)
            )

    return {
        "league": league,
        "changed": bool(changed_ids),
        "added": sorted(added),
        "modified": sorted(modified),
        "removed": sorted(removed),
        "changed_game_ids": sorted(changed_ids),
        "affected_teams": sorted(teams),
        "earliest_affected_date": (
            earliest_date.isoformat()
            if pd.notna(earliest_date)
            else None
        ),
    }


def update_data(
    league="nba", 
    source_slot="primary", 
    target_slot="candidate"
):

    if source_slot == target_slot:
        raise ValueError(
            "Source and target dataset slots cannot be the same"
        )

    # Dataset paths
    config = SPORT_CONFIG[league]

    source_raw_path, _ = get_dataset_paths(
        league,
        source_slot,
    )

    target_raw_path, target_processed_path = get_dataset_paths(
        league,
        target_slot,
    )

    target_raw_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Read source dataset
    old_df = pd.read_csv(source_raw_path)

    # Work on a separate copy
    df = old_df.copy()

    # Normalize IDs
    for column in ["game_id", "home_id", "away_id"]:
        df[column] = pd.to_numeric(
            df[column],
            errors="raise",
        ).astype("Int64")

    # Remove existing duplicate games
    df = df.drop_duplicates(
        subset="game_id",
        keep="last",
    )

    # Getting today's games
    today = pd.Timestamp.now(tz="UTC").date()

    games = []

    # PWHL
    if league == "pwhl":

        for season in range(today.year - 1, today.year + 1):

            try:
                new_games = config["schedule_function"](
                    season=season,
                    return_as_pandas=True,
                )
            except ValueError:
                continue

            if new_games is not None and not new_games.empty:
                games.append(new_games)

    # Soccer
    elif "league" in config:

        dates = [
            (today - timedelta(days=i)).strftime("%Y%m%d")
            for i in reversed(range(previous_game_days))
        ]

        for game_date in dates:

            new_games = config["schedule_function"](
                league=config["league"],
                dates=game_date,
                return_as_pandas=True,
                limit=500,
            )

            if new_games is not None and not new_games.empty:
                games.append(new_games)


    # ESPN
    else:

        # Get last 5 days of game data
        dates = [
            (today - timedelta(days=i)).strftime("%Y%m%d")
            for i in reversed(range(previous_game_days))
        ]

        for game_date in dates:

            new_games = config["schedule_function"](
                dates=game_date,
                return_as_pandas=True,
            )

            if new_games is not None and not new_games.empty:


                games.append(new_games)

    if not games:
        print(f"{league.upper()}: no new games found")
        new_games = pd.DataFrame()
    else:
        new_games = pd.concat(games, ignore_index=True)

    if not new_games.empty:

        # ---------------------------------
        # SOCCER
        # ---------------------------------

        if "league" in config:

            new_games = new_games.rename(
                columns={
                    "event_id": "game_id",
                    "home_team": "home_name",
                    "home_team_id": "home_id",
                    "away_team": "away_name",
                    "away_team_id": "away_id",
                    "venue": "venue_full_name",
                }
            )

            new_games = new_games[
                [
                    "game_id",
                    "date",
                    "status",
                    "home_name",
                    "home_id",
                    "home_score",
                    "away_name",
                    "away_id",
                    "away_score",
                    "venue_full_name",
                ]
            ].copy()

            new_games["is_postseason"] = 0
            new_games["season_type"] = 2

        # ---------------------------------
        # PWHL
        # ---------------------------------
        elif league == "pwhl":

            new_games = new_games.rename(
                columns={
                    "game_date": "date",
                    "home_team": "home_name",
                    "home_team_id": "home_id",
                    "away_team": "away_name",
                    "away_team_id": "away_id",
                    "venue": "venue_full_name",
                }
            )

            new_games = new_games[
                [
                    "game_id",
                    "date",
                    "game_status",
                    "home_name",
                    "home_id",
                    "home_score",
                    "away_name",
                    "away_id",
                    "away_score",
                    "venue_full_name",
                    "season_id",
                    "game_type",
                ]
            ].copy()

            new_games["is_postseason"] = (
                pd.to_numeric(new_games["season_id"], errors="coerce")
                .fillna(0)
                .astype(int)
                .mod(3)
                .eq(0)
                .astype(int)
            )

            new_games["season_type"] = (
                pd.to_numeric(new_games["season_id"], errors="coerce")
                .mod(3)
                .replace({
                    1: 1,  # Preseason
                    2: 2,  # Regular season
                    0: 3,  # Postseason
                })
            )

        else:
            new_games["is_postseason"] = (
                pd.to_numeric(new_games["season_type"], errors="coerce")
                .eq(3)
                .astype(int)
            )

            new_games["season_type"] = pd.to_numeric(
                new_games["season_type"],
                errors="coerce",
            )

        # ---------------------------------
        # FULL TEAM NAMES
        # ---------------------------------

        if "home_full_name" not in new_games.columns:
            new_games["home_full_name"] = new_games["home_name"]

        if "away_full_name" not in new_games.columns:
            new_games["away_full_name"] = new_games["away_name"]

        # Normalize id to integers
        for column in ["game_id", "home_id", "away_id"]:
            new_games[column] = pd.to_numeric(
                new_games[column],
                errors="raise"
            ).astype("Int64")

        # Keep the latest version of each game
        new_games = new_games.drop_duplicates(
            subset="game_id",
            keep="last"
        )

        # Remove old versions of refreshed games
        df = df[~df["game_id"].isin(new_games["game_id"])]

        # Add latest games
        df = pd.concat(
            [df, new_games],
            ignore_index=True
        )

    else:
        print(f"{league.upper()}: no new games found")

    # ---------------------------------
    # SEASON
    # ---------------------------------

    df["date"] = pd.to_datetime(
        df["date"],
        format="mixed",
        utc=True,
        errors="coerce"
    )

    # Sort games chronologically
    df = df.sort_values("date").reset_index(drop=True)

    # Gap larger than 30 days starts new season
    season_break = (
        df["date"].diff() > pd.Timedelta(days=30)
    )

    # Identify each season
    season_number = season_break.cumsum()

    # Get the year of the first game in each season
    season_start_year = (
        df.groupby(season_number)["date"]
        .transform("min")
        .dt.year
    )

    # Season is labeled by the ending year
    df["season"] = (
        season_start_year + 1
    ).astype(str)

    # Cutoff date for removing games
    cutoff_date = (
        pd.Timestamp.now(tz="UTC")
        - pd.DateOffset(years=DATA_RANGE_YEARS)
    )

    df["_date"] = df["date"]

    df = df.dropna(subset=["_date"])

    before_count = len(df)

    df = df[
        df["_date"] >= cutoff_date
    ]

    removed_count = before_count - len(df)

    df = df.drop(columns="_date")

    df = df.drop_duplicates(
        subset="game_id",
        keep="last"
    )

    df = df.sort_values("date").reset_index(drop=True)


    df["month"] = df["date"].dt.month
    df["day"] = df["date"].dt.day
    df["year"] = df["date"].dt.year

    df["is_postseason"] = df["is_postseason"].fillna(0).astype(int)

    df["season_type"] = (
        pd.to_numeric(df["season_type"], errors="coerce")
        .fillna(2)
        .astype(int)
    )

    # Write target raw dataset
    temp_path = target_raw_path.with_suffix(".tmp")
    df.to_csv(temp_path, index=False)
    os.replace(temp_path, target_raw_path)

    # Build target processed dataset
    process_league(
        league,
        raw_path=target_raw_path,
        output_path=target_processed_path,
    )

    # Compare candidate against active
    changes = get_change_report(
        league,
        old_df,
        df,
    )

    print(
        f"{league.upper()}: refreshed {len(new_games)} games, "
        f"removed {removed_count} games before {cutoff_date.date()}\n"
    )

    return changes

def update_all_data(
    source_slot="primary", 
    target_slot="candidate"
):

    changes = {}

    for league in SPORT_CONFIG:
        print(f"\n{'=' * 50}")
        print(f"Updating {league.upper()} data")
        print(f"{'=' * 50}")

        changes[league] = update_data(
            league,
            source_slot=source_slot,
            target_slot=target_slot,
        )

    return changes


def update_all_models():

    model_versions = {}

    for league in SPORT_CONFIG:
        print(f"\n{'=' * 50}")
        print(f"Training {league.upper()} model")
        print(f"{'=' * 50}")

        generation = train_model(league)

        model_versions[league] = generation

    return model_versions

