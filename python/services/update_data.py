from config.sports import SPORT_CONFIG
from pathlib import Path
import pandas as pd
from datetime import date, timedelta
import os

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

    # Get last 3 days so Scheduled games become Final
    dates = [
        (today - timedelta(days=i)).strftime("%Y%m%d")
        for i in reversed(range(3))
    ]

    games = []

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

    # Remove oldest date
    df["_date"] = pd.to_datetime(df["date"]).dt.date
    oldest_date = df["_date"].min()

    df = df[df["_date"] != oldest_date]
    df = df.drop(columns="_date")

    df = df.drop_duplicates(
        subset="game_id",
        keep="last"
    )
    df = df.sort_values("date").reset_index(drop=True)

    # Write to csv
    temp_path = output_path.with_suffix(".tmp")
    df.to_csv(temp_path, index=False)
    os.replace(temp_path, output_path)

    print(
        f"{league.upper()}: refreshed {len(new_games)} games "
        f"across the last 3 days, removed {oldest_date}"
    )