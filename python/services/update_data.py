from config.sports import SPORT_CONFIG
from pathlib import Path
import pandas as pd
from datetime import date

from services.model import train_model

def update_data(league="nba"):

    # Initial data
    config = SPORT_CONFIG[league]
    output_path = Path(config["output"])
    df = pd.read_csv(output_path)

    # Getting today's games
    today = date.today()
    date_string = today.strftime("%Y%m%d")

    new_games = config["schedule_function"](
        dates=date_string,
        return_as_pandas=True,
        limit=50
    )

    # Only modify csv if we get new games
    if new_games is not None and not new_games.empty:

        # Removing oldest date
        df["_date"] = pd.to_datetime(df["date"]).dt.date
        oldest_date = df["_date"].min()
        df = df[df["_date"] != oldest_date]
        df = df.drop(columns="_date")

        df = pd.concat([df, new_games], ignore_index=True)

        df.to_csv(output_path,index=False)

        print(
            f"{league.upper()}: removed {oldest_date}, "
            f"added {len(new_games)} games for {today}"
        )

        # Retrain model with updated data
        print(f"Retraining {league.upper()} model...")
        train_model(league=league)

    else:
        print(f"{league.upper()}: no games found for {today}")