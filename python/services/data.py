from datetime import date, timedelta
from pathlib import Path

import pandas as pd
from sportsdataverse.nba import espn_nba_schedule
from sportsdataverse.nfl import espn_nfl_schedule
from sportsdataverse.nhl import espn_nhl_schedule

SPORT_CONFIG = {
    "nba": {
        "schedule_function": espn_nba_schedule,
        "output": "data/raw/nba_games.csv",
    },

    "nfl": {
        "schedule_function": espn_nfl_schedule,
        "output": "data/raw/nfl_games.csv",
    },

    "nhl": {
        "schedule_function": espn_nhl_schedule,
        "output": "data/raw/nhl_games.csv",
    },
}

# Fixed time range (temp)
START_DATE = date(2020, 12, 22)
END_DATE = date(2025, 4, 13)

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

        if not df.empty:
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

    all_games.to_csv(output_path, index=False)

    print(f"Saved {len(all_games)} games to {output_path}")

collect_games("nhl")