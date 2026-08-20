from sportsdataverse.nba import espn_nba_schedule
from sportsdataverse.nfl import espn_nfl_schedule
from sportsdataverse.nhl import espn_nhl_schedule
from sportsdataverse.mlb import espn_mlb_schedule


SPORT_CONFIG = {
    "nba": {
        "schedule_function": espn_nba_schedule,
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
            "lead_changes",
            "percent_led",
        ],
    },

    "nfl": {
        "schedule_function": espn_nfl_schedule,
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
            "turnovers",
            "interceptions",
            "fumbles_lost",
            "sacks",
            "sack_yards",
            "penalties",
            "penalty_yards",
            "time_of_possession",
            "total_plays",
            "yards_per_play",
            "red_zone_efficiency",
        ],
    },

    "nhl": {
        "schedule_function": espn_nhl_schedule,
        "output": "data/raw/nhl_games.csv",
        "extra_features": [
            "blocked_shots",
            "hits",
            "takeaways",
            "shots_total",
            "power_play_goals",
            "power_play_opportunities",
            "power_play_pct",
            "short_handed_goals",
            "shootout_goals",
            "faceoffs_won",
            "faceoff_percent",
            "giveaways",
            "penalties",
            "penalty_minutes",
        ],
    },

    
    "mlb": {
        "schedule_function": espn_mlb_schedule,
        "output": "data/raw/mlb_games.csv",
        "extra_features": [
            "runs",
            "hits",
            "rb_is",
            "home_runs",
            "walks",
            "strikeouts",
            "avg",
            "on_base_pct",
            "slug_avg",
            "earned_runs",
            "era",
        ],
    },
}