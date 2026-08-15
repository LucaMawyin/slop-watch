
import pandas as pd
from config.sports import SPORT_CONFIG

pd.set_option("display.max_rows", None)

def get_games(league="nba"):

    df = pd.read_csv(f"data/raw/{league}_games.csv")

    # Convert the date column to datetime and ensure scores are numeric
    df["date"] = pd.to_datetime(df["date"])
    df["home_score"] = pd.to_numeric(df["home_score"], errors="coerce")
    df["away_score"] = pd.to_numeric(df["away_score"], errors="coerce")

    # Sort by date
    df = df.sort_values("date").reset_index(drop=True)

    # Filter completed regular season games
    if league in ["nba", "nfl", "nhl"]:
        df = df[
            (df["season_type"] == 2) &
            (df["status_type_name"] == "STATUS_FINAL")
        ].copy()

    elif league == "mlb":
        df = df[
            (df["season_type"] == 2) &
            (df["status_type_completed"] == True)
        ].copy()

    else:
        raise ValueError(f"Unsupported league: {league}")
    
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

    # Number of games before current game
    performance["games_before"] = (
        performance.groupby("team").cumcount()
    )

    # Number of wins before current game
    performance["wins_before"] = (
        performance.groupby("team")["win"]
        .transform(lambda x: x.astype(int).cumsum().shift(1))
    )

    # Point differential before current game
    performance["point_diff_before"] = (
        performance.groupby("team")["point_diff"]
        .transform(lambda x: x.cumsum().shift(1))
    )

    # Win pct before current game
    performance["win_pct"] = (
        performance["wins_before"] / performance["games_before"]
    )

    # Average point differential before current game
    performance["point_diff_avg"] = (
        performance["point_diff_before"] / performance["games_before"]
    )

    # Win pct for last 10 games
    performance["recent_win_pct"] = (
        performance.groupby("team")["win"]
        .transform(
            lambda x: x.shift(1).rolling(10, min_periods=1).mean()
        )
    )

    # Point diff for last 10 games
    performance["recent_point_diff"] = (
        performance.groupby("team")["point_diff"]
        .transform(
            lambda x: x.shift(1).rolling(10, min_periods=1).mean()
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

    future_games = df[
        (df["season_type"] == 2) &
        (df["date"] >= prediction_date) 
    ].copy()

    # Remove duplicates
    future_games = future_games.drop_duplicates(
        subset=["game_id"]
    )

    return future_games