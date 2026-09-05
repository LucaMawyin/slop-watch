import pandas as pd
from config.sports import SPORT_CONFIG, DATA_RANGE_YEARS

import time

def get_games(league="mlb", start_date=None, days_ahead=7):

    start_time = time.perf_counter()

    if league not in SPORT_CONFIG:
        raise ValueError(f"Unsupported league: {league}")

    # Default to today
    
    if start_date is None:
        start_date = pd.Timestamp.now("UTC")
    else:
        start_date = pd.Timestamp(start_date)

        if start_date.tzinfo is None:
            start_date = start_date.tz_localize("UTC")
        else:
            start_date = start_date.tz_convert("UTC")

    start_date = start_date.normalize()

    end_date = (
        start_date
        + pd.Timedelta(days=days_ahead + 1)
        - pd.Timedelta(nanoseconds=1)
    )

    data_start_date = (
        pd.Timestamp.now("UTC")
        - pd.DateOffset(years=DATA_RANGE_YEARS)
    ).normalize()

    # ---------------------------------
    # LOAD PROCESSED CSV
    # ---------------------------------

    processed = pd.read_csv(
        SPORT_CONFIG[league]["processed_output"]
    )

    processed["date"] = pd.to_datetime(
        processed["date"],
        utc=True
    )

    latest_date = processed["date"].max()

    # ---------------------------------
    # READ PROCESSED DATA IF NEEDED
    # ---------------------------------

    if start_date >= data_start_date:

        processed_games = processed[
            (processed["date"] >= start_date) &
            (processed["date"] <= end_date)
        ].copy()

    else:
        processed_games = pd.DataFrame()

    # ---------------------------------
    # RETURN IF DATE RANGE IS COVERED
    # ---------------------------------

    if (
        start_date >= data_start_date
        and latest_date > end_date
    ):
        print(
            f"get_games took "
            f"{time.perf_counter() - start_time:.3f}s"
        )

        return processed_games

    # ---------------------------------
    # FETCH MISSING GAMES FROM API
    # ---------------------------------

    if start_date >= data_start_date:
        fetch_start = max(
            start_date,
            latest_date.normalize()
        )
    else:
        fetch_start = start_date

    fetch_end = end_date

    config = SPORT_CONFIG[league]
    schedule_function = config["schedule_function"]

    games = []

    # ---------------------------------
    # PWHL
    # ---------------------------------

    if league == "pwhl":
        for season in range(
            fetch_start.year,
            fetch_end.year + 1
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
                    "venue": "venue_full_name",
                })

                df["date"] = pd.to_datetime(
                    df["date"],
                    utc=True,
                    errors="coerce"
                )

                df["month"] = df["date"].dt.month
                df["day"] = df["date"].dt.day
                df["year"] = df["date"].dt.year

                df["season_id"] = pd.to_numeric(
                    df["season_id"],
                    errors="coerce"
                )

                df["is_postseason"] = (
                    df["season_id"] % 3 == 0
                ).astype(int)

                games.append(df)

    # ---------------------------------
    # SOCCER
    # ---------------------------------

    elif "league" in SPORT_CONFIG[league]:

        current_date = fetch_start

        while current_date <= fetch_end:

            df = schedule_function(
                league=config["league"],
                dates=current_date.strftime("%Y%m%d"),
                return_as_pandas=True,
                limit=500
            )

            if df is not None and not df.empty:

                df = df.rename(columns={
                    "event_id" : "game_id",
                    "home_team": "home_name",
                    "home_team_id": "home_id",
                    "away_team": "away_name",
                    "away_team_id": "away_id",
                    "venue": "venue_full_name",
                })

                df["date"] = pd.to_datetime(
                    df["date"],
                    utc=True,
                    errors="coerce"
                )

                df["month"] = df["date"].dt.month
                df["day"] = df["date"].dt.day
                df["year"] = df["date"].dt.year

                df["is_postseason"] = 0

                games.append(df)

            current_date += pd.Timedelta(days=1)

    # ---------------------------------
    # ESPN
    # ---------------------------------

    else:

        current_date = fetch_start

        while current_date <= fetch_end:

            df = schedule_function(
                dates=current_date.strftime("%Y%m%d"),
                return_as_pandas=True,
                limit=50
            )

            if df is not None and not df.empty:

                df["date"] = pd.to_datetime(
                    df["date"],
                    utc=True,
                    errors="coerce"
                )

                df["month"] = df["date"].dt.month
                df["day"] = df["date"].dt.day
                df["year"] = df["date"].dt.year

                df["is_postseason"] = (
                    df["season_type"] == 3
                ).astype(int)

                games.append(df)

            current_date += pd.Timedelta(days=1)

    # ---------------------------------
    # COMBINE API DATA
    # ---------------------------------
    if games:

        fetched_games = pd.concat(
            games,
            ignore_index=True
        )

        fetched_games["date"] = pd.to_datetime(
            fetched_games["date"],
            utc=True,
            errors="coerce"
        )

        fetched_games = fetched_games[
            (fetched_games["date"] >= fetch_start) &
            (fetched_games["date"] <= fetch_end)
        ].copy()

        fetched_games = fetched_games.drop_duplicates(
            subset="game_id",
            keep="last"
        ).copy()

    else:
        fetched_games = pd.DataFrame()

    # ---------------------------------
    # GET HISTORICAL DATA
    # ---------------------------------

    historical = processed[
        processed["date"] < start_date
    ].copy()

    # ---------------------------------
    # LATEST TEAM PERFORMANCE
    # ---------------------------------

    team_performance = pd.concat([
        historical[
            [
                "date",
                "home_name",
                "home_win_pct",
                "home_point_diff",
                "home_recent_win_pct",
                "home_recent_point_diff",
            ]
        ].rename(columns={
            "home_name": "team",
            "home_win_pct": "win_pct",
            "home_point_diff": "point_diff",
            "home_recent_win_pct": "recent_win_pct",
            "home_recent_point_diff": "recent_point_diff",
        }),

        historical[
            [
                "date",
                "away_name",
                "away_win_pct",
                "away_point_diff",
                "away_recent_win_pct",
                "away_recent_point_diff",
            ]
        ].rename(columns={
            "away_name": "team",
            "away_win_pct": "win_pct",
            "away_point_diff": "point_diff",
            "away_recent_win_pct": "recent_win_pct",
            "away_recent_point_diff": "recent_point_diff",
        }),
    ])

    latest = (
        team_performance
        .sort_values("date")
        .groupby("team")
        .tail(1)
    )

    # ---------------------------------
    # ATTACH TO FUTURE GAMES
    # ---------------------------------

    home = latest[
        [
            "team",
            "win_pct",
            "point_diff",
            "recent_win_pct",
            "recent_point_diff",
        ]
    ].rename(columns={
        "team": "home_name",
        "win_pct": "home_win_pct",
        "point_diff": "home_point_diff",
        "recent_win_pct": "home_recent_win_pct",
        "recent_point_diff": "home_recent_point_diff",
    })

    away = latest[
        [
            "team",
            "win_pct",
            "point_diff",
            "recent_win_pct",
            "recent_point_diff",
        ]
    ].rename(columns={
        "team": "away_name",
        "win_pct": "away_win_pct",
        "point_diff": "away_point_diff",
        "recent_win_pct": "away_recent_win_pct",
        "recent_point_diff": "away_recent_point_diff",
    })

    # ---------------------------------
    # ATTACH TO FUTURE GAMES
    # ---------------------------------

    if not fetched_games.empty:

        fetched_games = (
            fetched_games
            .merge(home, on="home_name", how="left")
            .merge(away, on="away_name", how="left")
        )

    # ---------------------------------
    # COMBINE PROCESSED W/ API
    # ---------------------------------

    if not processed_games.empty and not fetched_games.empty:

        result = pd.concat(
            [processed_games, fetched_games],
            ignore_index=True
        )

    elif not processed_games.empty:
        result = processed_games

    else:
        result = fetched_games


    # Remove duplicates
    result["game_id"] = (
        result["game_id"]
        .astype(str)
        .str.strip()
    )

    result = result.drop_duplicates(
        subset="game_id",
        keep="first"
    ).copy()

    print(
        f"get_games took "
        f"{time.perf_counter() - start_time:.3f}s"
    )

    return result