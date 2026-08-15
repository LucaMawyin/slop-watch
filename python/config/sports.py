from sportsdataverse.nba import espn_nba_schedule
from sportsdataverse.nfl import espn_nfl_schedule
from sportsdataverse.nhl import espn_nhl_schedule
from sportsdataverse.mlb import espn_mlb_schedule


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
    
    "mlb": {
        "schedule_function": espn_mlb_schedule,
        "output": "data/raw/mlb_games.csv",
    },
}