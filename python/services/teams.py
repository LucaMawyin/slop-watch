import pandas as pd

from config.sports import SPORT_CONFIG


def get_teams(league):
    df = pd.read_csv(SPORT_CONFIG[league]["output"])

    # Only use regular season games
    if "season_type" in df.columns:
        df = df[df["season_type"] == 2]
    elif "season_id" in df.columns:
        df = df[df["season_id"] % 3 == 2]
    else:
        df = df[df["is_postseason"] == 0]

    # Exclude wnba all star teams
    if league == "wnba":
        df = df[
            ~df["home_name"].str.contains(
                r"Team Spoon|Team Coop", case=False, na=False
            )
            & ~df["away_name"].str.contains(
                r"Team Spoon|Team Coop", case=False, na=False
            )
        ]

    if df.empty:
        return []

    current_season = df["season"].astype(int).max()
    season_df = df[df["season"].astype(int) == current_season]

    home_teams = season_df[
        ["home_name", "home_full_name", "home_id"]
    ].rename(columns={
        "home_name": "name",
        "home_full_name": "full_name",
        "home_id": "id",
    })

    away_teams = season_df[
        ["away_name", "away_full_name", "away_id"]
    ].rename(columns={
        "away_name": "name",
        "away_full_name": "full_name",
        "away_id": "id",
    })

    teams = pd.concat([home_teams, away_teams], ignore_index=True)

    # Exclude any team containing all star
    teams = teams[
        ~teams["name"].str.contains(
            r"all[- ]?star", case=False, na=False, regex=True
        )
        & ~teams["full_name"].str.contains(
            r"all[- ]?star", case=False, na=False, regex=True
        )
    ]

    teams = teams.dropna(subset=["id", "name"])
    teams["name"] = teams["name"].astype(str).str.strip()
    teams["full_name"] = teams["full_name"].fillna(teams["name"])
    teams = teams[teams["name"] != ""]

    teams = teams.drop_duplicates(subset=["id"])
    teams = teams.sort_values("name")

    return teams.to_dict(orient="records")