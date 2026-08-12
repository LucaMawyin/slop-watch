from datetime import date, timedelta
from pathlib import Path

import pandas as pd
from sportsdataverse.nba import espn_nba_schedule

# Fixed time range (temp)
START_DATE = date(2024, 10, 22)
END_DATE = date(2025, 4, 13)

games = []

# Loop through each date in the range and fetch the NBA schedule
current_date = START_DATE
while current_date <= END_DATE:
    date_string = current_date.strftime("%Y%m%d")

    df = espn_nba_schedule(
        dates=date_string,
        return_as_pandas=True,
        limit=50
    )

    if not df.empty:
        games.append(df)
        print(f"{date_string}: {len(df)} games")

    current_date += timedelta(days=1)

    
if not games:
    raise RuntimeError("No games were collected.")

# Concatenate all the DataFrames into a single DataFrame
all_games = pd.concat(games, ignore_index=True)

# Create the output directory if it doesn't exist
output_path = Path("data/raw/nba_games.csv")
output_path.parent.mkdir(parents=True, exist_ok=True)

all_games.to_csv(output_path, index=False)

print(f"Saved {len(all_games)} games to {output_path}")