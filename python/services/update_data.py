from config.sports import SPORT_CONFIG
from pathlib import Path
import pandas as pd
from datetime import date, timedelta
import os

from services.process_league import process_league

def update_data(league="nba"):

    # Initial data
    config = SPORT_CONFIG[league]
    output_path = Path(config["output"])

    df = pd.read_csv(output_path)
    df["game_id"] = df["game_id"].astype(str)

    # Remove any existing duplicate games
    df = df.drop_duplicates(
        subset="game_id",
        keep="last"
    )

    # Getting today's games
    today = date.today()

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
            for i in reversed(range(3))
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

        # Get last 3 days so Scheduled games become Final
        dates = [
            (today - timedelta(days=i)).strftime("%Y%m%d")
            for i in reversed(range(3))
        ]

        for game_date in dates:

            new_games = config["schedule_function"](
                dates=game_date,
                return_as_pandas=True,
            )

            if new_games is not None and not new_games.empty:


                games.append(new_games)

    if not games:
        print(f"{league.upper()}: no games found")
        return

    new_games = pd.concat(games, ignore_index=True)

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

    else:
        new_games["is_postseason"] = (
            pd.to_numeric(new_games["season_type"], errors="coerce")
            .eq(3)
            .astype(int)
        )

    # Game id as string
    new_games["game_id"] = new_games["game_id"].astype(str)

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

    # ---------------------------------
    # SEASON
    # ---------------------------------

    df["date"] = pd.to_datetime(
        df["date"],
        format="mixed",
        utc=True,
        errors="coerce"
    )

    if league in ["nba", "wnba", "nfl", "nhl", "mlb"]:

        df["season"] = df["date"].dt.year.astype(str)

    elif league == "pwhl":

        df["season_id"] = pd.to_numeric(
            df["season_id"],
            errors="coerce"
        )

        df["season"] = (
            ((df["season_id"] - 1) // 3) + 1
        ).astype("Int64").astype(str)

    elif league == "mls":

        df["season"] = df["date"].dt.year.astype(str)

    elif league in [
        "epl",
        "laliga",
        "serie_a",
        "bundesliga",
        "ligue_1",
    ]:

        season_start = (
            df["date"].dt.year
            - (df["date"].dt.month < 7).astype(int)
        )

        df["season"] = (
            season_start.astype(str)
            + "-"
            + (season_start + 1).astype(str)
        )

    df["date"] = pd.to_datetime(
        df["date"],
        format="mixed",
        utc=True,
        errors="coerce"
    )

    cutoff_date = (
        pd.Timestamp.now(tz="UTC")
        - pd.DateOffset(years=5)
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

    # Write to csv
    temp_path = output_path.with_suffix(".tmp")
    df.to_csv(temp_path, index=False)
    os.replace(temp_path, output_path)

    # Rebuild processed data
    process_league(league)

    print(
        f"{league.upper()}: refreshed {len(new_games)} games, "
        f"removed {removed_count} games before {cutoff_date.date()}\n"
    )