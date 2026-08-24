from datetime import date, timedelta
from pathlib import Path
import pandas as pd
import os
from config.sports import SPORT_CONFIG

# 5 years of data
END_DATE = date.today()
START_DATE = END_DATE - timedelta(days=5 * 365)

def collect_games(sport):
    config = SPORT_CONFIG[sport]
    schedule_function = config["schedule_function"]

    games = []

    # Loop through each date in the range and fetch the NBA schedule
    current_date = START_DATE
    while current_date <= END_DATE:
        date_string = current_date.strftime("%Y%m%d")

        df = schedule_function(
            dates=date_string,
            return_as_pandas=True,
            limit=50
        )
        
        if df is None:
            current_date += timedelta(days=1)
            continue

        if df is not None and not df.empty:
            games.append(df)
            print(
                f"{sport.upper()} {date_string}: "
                f"{len(df)} games"
            )

        current_date += timedelta(days=1)

        
    if not games:
        raise RuntimeError(
            f"No {sport.upper()} games were collected."
        )
    
    # Concatenate all the DataFrames into a single DataFrame
    all_games = pd.concat(games, ignore_index=True)

    # Create the output directory if it doesn't exist
    output_path = Path(config["output"])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    temp_path = output_path.with_suffix(".tmp")
    all_games.to_csv(temp_path, index=False)
    os.replace(temp_path,output_path)

    print(f"Saved {len(all_games)} games to {output_path}")

collect_games("nhl")
collect_games("nba")
collect_games("nfl")
collect_games("mlb")
