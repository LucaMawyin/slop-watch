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

    # PWHL schedule
    if config.get("schedule_type") == "season":

        for season in range(
            2024,
            END_DATE.year + 1
        ):
            df = schedule_function(
                season=season,
                return_as_pandas=True
            )

            if df is not None and not df.empty:

                df = df.rename(columns={
                    "game_date": "date",
                    "home_team_id": "home_id",
                    "home_team": "home_name",
                    "away_team_id": "away_id",
                    "away_team": "away_name",
                    "venue":"venue_full_name",
                })

                games.append(df)

                print(
                    f"{sport.upper()} {season}: "
                    f"{len(df)} games"
                )

    # Soccer
    elif "league" in config:

        current_date = START_DATE

        while current_date <= END_DATE:
            date_string = current_date.strftime("%Y%m%d")
            df = schedule_function(
                league=config["league"],
                dates=date_string,
                return_as_pandas=True,
                limit=50
            )
            
            if df is not None and not df.empty:

                df = df.rename(columns={
                    "event_id": "game_id",
                    "home_team": "home_name",
                    "home_team_id": "home_id",
                    "away_team": "away_name",
                    "away_team_id": "away_id",
                    "venue": "venue_full_name",
                })

                games.append(df)

                print(
                    f"{sport.upper()} {date_string}: "
                    f"{len(df)} games"
                )

            current_date += timedelta(days=1)


    # ESPN schedule
    else:
        
        current_date = START_DATE

        while current_date <= END_DATE:
            date_string = current_date.strftime("%Y%m%d")

            df = schedule_function(
                dates=date_string,
                return_as_pandas=True,
                limit=50
            )

            if df is not None and not df.empty:
                
                games.append(df)

                print(
                    f"{sport.upper()} {date_string}: "
                    f"{len(df)} games",
                    flush=True
                )

            current_date += timedelta(days=1)

        
    if not games:
        raise RuntimeError(
            f"No {sport.upper()} games were collected."
        )
    
    # Concatenate all the DataFrames into a single DataFrame
    all_games = pd.concat(games, ignore_index=True)

    all_games = all_games.drop_duplicates(
        subset="game_id",
        keep="first"
    )

    # ---------------------------------
    # REGULAR VS POSTSEASON
    # ---------------------------------

    if sport in ["nba", "wnba", "nfl", "nhl", "mlb"]:
        all_games["season_type"] = all_games["season_type"].map({
            2: "regular_season",
            3: "postseason",
        })

    elif sport == "pwhl":
        # PWHL postseason is divisible by 3
        all_games["season_type"] = (
            all_games["season_id"]
            .apply(
                lambda x: (
                    "postseason"
                    if pd.notna(x) and str(x).isdigit() and int(x) % 3 == 0
                    else "regular_season"
                )
            )
        )

    elif sport in [
        "mls",
        "epl",
        "laliga",
        "serie_a",
        "bundesliga",
        "ligue_1",
    ]:
        # TODO: determine postseason from the soccer API data
        all_games["season_type"] = "regular_season"


    all_games["date"] = pd.to_datetime(
        all_games["date"],
        utc=True,
        errors="coerce"
    )

    all_games["month"] = all_games["date"].dt.month
    all_games["day"] = all_games["date"].dt.day
    all_games["year"] = all_games["date"].dt.year

    # Create the output directory if it doesnt exist
    output_path = Path(config["output"])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    temp_path = output_path.with_suffix(".tmp")
    all_games.to_csv(temp_path, index=False)
    os.replace(temp_path,output_path)

    print(f"Saved {len(all_games)} games to {output_path}")

for sport in SPORT_CONFIG:
    print()
    print("=" * 50)
    print(f"Collecting {sport.upper()}")
    print("=" * 50)

    collect_games(sport)