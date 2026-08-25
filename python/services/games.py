
import pandas as pd
from config.sports import SPORT_CONFIG

pd.set_option("display.max_rows", None)

def get_games(league="nba"):

    df = pd.read_csv(f"data/raw/{league}_games.csv")

    # Convert the date column to datetime and ensure scores are numeric
    df["date"] = pd.to_datetime(df["date"], utc=True)
    df["home_score"] = pd.to_numeric(df["home_score"], errors="coerce")
    df["away_score"] = pd.to_numeric(df["away_score"], errors="coerce")

    # Sort by date
    df = df.sort_values("date").reset_index(drop=True)

    # Filter completed regular season games
    if league in ["nba", "wnba", "nfl", "nhl"]:
        df = df[
            (df["season_type"] == 2) &
            (df["status_type_name"] == "STATUS_FINAL")
        ].copy()

    elif league == "mlb":
        df = df[
            (df["season_type"] == 2) &
            (df["status_type_completed"] == True)
        ].copy()

    elif league == "pwhl":
        df = df[
            df["game_status"].str.startswith("Final", na=False)
        ].copy()

    elif league in [
        "mls",
        "epl",
        "laliga",
        "serie_a",
        "bundesliga",
        "ligue_1",
    ]:
        df = df[
            df["status"] == "STATUS_FULL_TIME"
        ].copy()

    else:
        raise ValueError(f"Unsupported league: {league}")

    # Remove duplicates
    df = df.drop_duplicates(
        subset=["game_id"]
    )
    
    df = df.dropna(subset=["home_score", "away_score"])

    # Reduce dataframe to the columns needed
    games = df[
        [
            "game_id",
            "date",
            "home_id",
            "home_name",
            "home_score",
            "away_id",
            "away_name",
            "away_score",
        ]
    ].copy()

    return games

def get_performance(league="nba"):

    games = get_games(league=league)
    window = SPORT_CONFIG[league]["performance_window"]

    # Performance per team per game
    performance = pd.concat([

        # Home team performance
        pd.DataFrame({
            "game_id": games["game_id"],
            "date" : games["date"],
            "team": games["home_name"],
            "opponent": games["away_name"],
            "win" : games["home_score"] > games["away_score"],
            "point_diff" : games["home_score"] - games["away_score"],
        }),

        # Away team performance
        pd.DataFrame({
            "game_id": games["game_id"],
            "date" : games["date"],
            "team": games["away_name"],
            "opponent": games["home_name"],
            "win" : games["away_score"] > games["home_score"],
            "point_diff" : games["away_score"] - games["home_score"],
        }),
    ], ignore_index=True)

    # Sort by date
    performance = (
        performance
        .sort_values("date")
        .reset_index(drop=True)
    )

    group = performance.groupby("team")

    # ---------------------------------
    # LAST 2 SEASONS
    # ---------------------------------
    performance["win_pct"] = (
        group["win"]
        .transform(
            lambda x: (
                x.shift(1)
                .rolling(window, min_periods=1)
                .mean()
            )
        )
    )

    performance["point_diff_avg"] = (
        group["point_diff"]
        .transform(
            lambda x: (
                x.shift(1)
                .rolling(window, min_periods=1)
                .mean()
            )
        )
    )

    # ---------------------------------
    # LAST 10 GAMES
    # ---------------------------------

    performance["recent_win_pct"] = (
        group["win"]
        .transform(
            lambda x: (
                x.shift(1)
                .rolling(10, min_periods=1)
                .mean()
            )
        )
    )

    performance["recent_point_diff"] = (
        group["point_diff"]
        .transform(
            lambda x: (
                x.shift(1)
                .rolling(10, min_periods=1)
                .mean()
            )
        )
    )

    return performance

def get_future_games(prediction_date=None, days_ahead=30, league="nba"):

    if league not in SPORT_CONFIG:
        raise ValueError(f"Unsupported league: {league}")

    schedule_function = SPORT_CONFIG[league]["schedule_function"]

    if prediction_date is None:
        prediction_date = pd.Timestamp.now(tz="UTC")

    prediction_date = pd.Timestamp(prediction_date)

    if prediction_date.tzinfo is None:
        prediction_date = prediction_date.tz_localize("UTC")
    else:
        prediction_date = prediction_date.tz_convert("UTC")

    end_date = prediction_date + pd.Timedelta(days=days_ahead)

    games = []

    # PWHL
    if league == "pwhl":

        for season in range(
            prediction_date.year,
            end_date.year + 1
        ):
            try:
                df = schedule_function(
                    season=season,
                    return_as_pandas=True
                )
            except ValueError:
                continue

            if df is not None and not df.empty:
                df = df.rename(columns={
                    "game_date": "date",
                    "home_team_id": "home_id",
                    "home_team": "home_name",
                    "away_team_id": "away_id",
                    "away_team": "away_name",
                    "venue":"venue_full_name",
                })

                df["season_id"] = pd.to_numeric(
                    df["season_id"],
                    errors="coerce"
                )

                # Regular season only
                df = df[df["season_id"] % 3 == 1]
                
                games.append(df)
                
    # Soccer
    elif "league" in SPORT_CONFIG[league]:

        current_date = prediction_date.normalize()

        while current_date <= end_date:

            df = schedule_function(
                league=SPORT_CONFIG[league]["league"],
                dates=current_date.strftime("%Y%m%d"),
                return_as_pandas=True,
                limit=500
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

            current_date += pd.Timedelta(days=1)

    # ESPN
    else:
        current_date = prediction_date.normalize()
        while current_date <= end_date:

            df = schedule_function(
                dates=current_date.strftime("%Y%m%d"),
                return_as_pandas=True,
                limit=50
            )

            if df is not None and not df.empty:
                games.append(df)

            current_date += pd.Timedelta(days=1)

    if not games:
        return pd.DataFrame()

    df = pd.concat(games, ignore_index=True)

    df["date"] = pd.to_datetime(df["date"], utc=True)

    if league == "pwhl":
        future_games = df[
            (df["date"] >= prediction_date) &
            (df["date"] <= end_date)
        ].copy()

    elif "league" in SPORT_CONFIG[league]:
        future_games = df[
            (df["date"] >= prediction_date) &
            (df["date"] <= end_date)
        ].copy()

    else:
        future_games = df[
            (df["season_type"] == 2) &
            (df["date"] >= prediction_date) &
            (df["date"] <= end_date)
        ].copy()

    # Remove duplicates
    future_games = future_games.drop_duplicates(
        subset=["game_id"]
    )

    return future_games