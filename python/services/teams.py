import pandas as pd

from config.sports import SPORT_CONFIG

def get_teams(league):
    df = pd.read_csv(SPORT_CONFIG[league]["output"])

    current_season = df["season"].max()
    season_df = df[df["season"] == current_season]

    team_names = (
        set(season_df["home_name"].dropna())
        | set(season_df["away_name"].dropna())
    )

    team_names = {
        team for team in team_names
        if str(team).strip()
    }

    return sorted(team_names)