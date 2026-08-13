import pandas as pd
pd.set_option("display.max_rows", None)

def get_games(league="nba"):

    df = pd.read_csv(f"data/raw/{league}_games.csv")

    # Convert the date column to datetime and ensure scores are numeric
    df["date"] = pd.to_datetime(df["date"])
    df["home_score"] = pd.to_numeric(df["home_score"], errors="coerce")
    df["away_score"] = pd.to_numeric(df["away_score"], errors="coerce")

    # Sort the DataFrame by date and reset the index
    df = df.sort_values("date").reset_index(drop=True)

    # Filter for completed regular season games
    df = df[
            (df["season_type"] == 2) & 
            (df["status_type_name"] == "STATUS_FINAL")
        ].copy()
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

def get_performance():

    games = get_games()

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