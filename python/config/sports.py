from sportsdataverse.nba import (
    espn_nba_schedule,
    espn_nba_game_team_statistics,
)
from sportsdataverse.nfl import (
    espn_nfl_schedule,
    espn_nfl_game_team_statistics,
)
from sportsdataverse.nhl import (
    espn_nhl_schedule,
    espn_nhl_game_team_statistics,
)
from sportsdataverse.mlb import (
    espn_mlb_schedule,
    espn_mlb_game_team_statistics,
)

SPORT_CONFIG = {
    "nba": {
        "schedule_function": espn_nba_schedule,
        "statistics_function": espn_nba_game_team_statistics,
        "output": "data/raw/nba_games.csv",
        "extra_features": [
            "field_goal_pct",
            "three_point_pct",
            "free_throw_pct",
            "rebounds",
            "offensive_rebounds",
            "defensive_rebounds",
            "assists",
            "steals",
            "blocks",
            "turnovers",
            "points_conceded_off_turnovers",
            "fast_break_points",
            "points_in_paint",
            "fouls",
            "largest_lead",
        ],
    },

    "nfl": {
        "schedule_function": espn_nfl_schedule,
        "statistics_function": espn_nfl_game_team_statistics,
        "output": "data/raw/nfl_games.csv",
        "extra_features": [
            "first_downs",
            "first_downs_passing",
            "first_downs_rushing",
            "first_downs_penalty",
            "third_down_efficiency",
            "fourth_down_efficiency",
            "total_yards",
            "passing_yards",
            "rushing_yards",
            "yards_per_pass",
            "yards_per_rush",
            "interceptions",
            "fumbles_lost",
            "sacks",
            "sack_yards",
            "penalties",
            "penalty_yards",
            "time_of_possession",
            "total_plays",
            "red_zone_efficiency",
        ],
    },

    "nhl": {
        "schedule_function": espn_nhl_schedule,
        "statistics_function": espn_nhl_game_team_statistics,
        "output": "data/raw/nhl_games.csv",
        "extra_features": [
            "blockedShots",
            "hits",
            "takeaways",
            "shotsTotal",
            "powerPlayGoals",
            "powerPlayOpportunities",
            "powerPlayPct",
            "shortHandedGoals",
            "shootoutGoals",
            "faceoffsWon",
            "faceoffPercent",
            "giveaways",
            "penalties",
            "penaltyMinutes",
        ],
    },

    
    "mlb": {
        "schedule_function": espn_mlb_schedule,
        "statistics_function": espn_mlb_game_team_statistics,
        "output": "data/raw/mlb_games.csv",
        "extra_features": [
            "runs",
            "hits",
            "RBIs",
            "homeRuns",
            "walks",
            "strikeouts",
            "avg",
            "onBasePct",
            "slugAvg",
            "earnedRuns",
            "ERA",
        ],
    },
}