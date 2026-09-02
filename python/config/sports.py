
# ---------------------------------
# BASKETBALL
# ---------------------------------

from sportsdataverse.nba import (
    espn_nba_schedule,
    espn_nba_game_team_statistics,
)

from sportsdataverse.wnba import (
    espn_wnba_schedule,
    espn_wnba_game_team_statistics,
)

# ---------------------------------
# FOOTBALL
# ---------------------------------

from sportsdataverse.nfl import (
    espn_nfl_schedule,
    espn_nfl_game_team_statistics,
)

# ---------------------------------
# HOCKEY
# ---------------------------------

from sportsdataverse.nhl import (
    espn_nhl_schedule,
    espn_nhl_game_team_statistics,
)

from sportsdataverse.pwhl import (
    pwhl_schedule,
    pwhl_game_summary,
)

# ---------------------------------
# BASEBALL
# ---------------------------------

from sportsdataverse.mlb import (
    espn_mlb_schedule,
    espn_mlb_game_team_statistics,
)

# ---------------------------------
# SOCCER
# ---------------------------------

from sportsdataverse.soccer import espn_soccer_scoreboard

from sportsdataverse.soccer.mls import espn_mls_summary
from sportsdataverse.soccer.epl import espn_epl_summary
from sportsdataverse.soccer.laliga import espn_laliga_summary
from sportsdataverse.soccer.seriea import espn_seriea_summary
from sportsdataverse.soccer.bundesliga import espn_bundesliga_summary
from sportsdataverse.soccer.ligue1 import espn_ligue1_summary

SPORT_LEAGUES = {
    "basketball": ["nba", "wnba"],
    "football": ["nfl"],
    "hockey": ["nhl", "pwhl"],
    "baseball": ["mlb"],
    "soccer": [
        "mls",
        "epl",
        "laliga",
        "serie_a",
        "bundesliga",
        "ligue_1",
    ],
}

NUMBER_OF_SEASONS = 1

SPORT_CONFIG = {

    # ---------------------------------
    # BASKETBALL
    # ---------------------------------

    "nba": {
        # Data
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
        "performance_window" : 82 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -20,
        "point_diff_max": 20,
        "total_points_min": 180,
        "total_points_max": 260,
        "margin_max": 30,
    },

    "wnba": {
        # Data
        "schedule_function": espn_wnba_schedule,
        "statistics_function": espn_wnba_game_team_statistics,
        "output": "data/raw/wnba_games.csv",
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
        "performance_window": 44 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -20,
        "point_diff_max": 20,
        "total_points_min": 130,
        "total_points_max": 190,
        "margin_max": 30,
    },

    # ---------------------------------
    # FOOTBALL
    # ---------------------------------

    "nfl": {

        # Data
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
        "performance_window" : 17 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -30,
        "point_diff_max": 30,
        "total_points_min": 20,
        "total_points_max": 70,
        "margin_max": 21,
    },

    # ---------------------------------
    # HOCKEY
    # ---------------------------------

    "nhl": {

        # Data
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
        "performance_window" : 82 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -5,
        "point_diff_max": 5,
        "total_points_min": 3,
        "total_points_max": 10,
        "margin_max": 4,
    },

    "pwhl": {
        # Data
        "schedule_function": pwhl_schedule,
        "statistics_function": pwhl_game_summary,
        "output": "data/raw/pwhl_games.csv",
        "schedule_type": "season",
        "extra_features": [
            "shots_on_goal",
            "blocked_shots",
            "hits",
            "faceoffs_won",
            "faceoff_pct",
            "power_play_goals",
            "power_play_opportunities",
            "penalty_minutes",
            "giveaways",
            "takeaways",
        ],
        "performance_window": 30 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -5,
        "point_diff_max": 5,
        "total_points_min": 3,
        "total_points_max": 10,
        "margin_max": 4,
    },

    # ---------------------------------
    # BASEBALL
    # ---------------------------------
    
    "mlb": {

        # Data
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
        "performance_window" : 162 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -5,
        "point_diff_max": 5,
        "total_points_min": 3,
        "total_points_max": 12,
        "margin_max": 5,
    },

    # ---------------------------------
    # SOCCER
    # ---------------------------------

    "mls": {
        # Data
        "schedule_function": espn_soccer_scoreboard,
        "statistics_function": espn_mls_summary,
        "league": "usa.1",
        "output": "data/raw/mls_games.csv",
        "extra_features": [
            "shots",
            "shots_on_target",
            "possession",
            "passes",
            "pass_accuracy",
            "fouls",
            "yellow_cards",
            "red_cards",
            "offsides",
            "corner_kicks",
            "saves",
        ],
        "performance_window": 34 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -3,
        "point_diff_max": 3,
        "total_points_min": 1,
        "total_points_max": 6,
        "margin_max": 3,
    },
    "epl": {
        # Data
        "schedule_function": espn_soccer_scoreboard,
        "statistics_function": espn_epl_summary,
        "league": "eng.1",
        "output": "data/raw/epl_games.csv",
        "extra_features": [
            "shots",
            "shots_on_target",
            "possession",
            "passes",
            "pass_accuracy",
            "fouls",
            "yellow_cards",
            "red_cards",
            "offsides",
            "corner_kicks",
            "saves",
        ],
        "performance_window": 38 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -3,
        "point_diff_max": 3,
        "total_points_min": 1,
        "total_points_max": 6,
        "margin_max": 3,
    },

    "laliga": {
        # Data
        "schedule_function": espn_soccer_scoreboard,
        "statistics_function": espn_laliga_summary,
        "league": "esp.1",
        "output": "data/raw/laliga_games.csv",
        "extra_features": [
            "shots",
            "shots_on_target",
            "possession",
            "passes",
            "pass_accuracy",
            "fouls",
            "yellow_cards",
            "red_cards",
            "offsides",
            "corner_kicks",
            "saves",
        ],
        "performance_window": 38 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -3,
        "point_diff_max": 3,
        "total_points_min": 1,
        "total_points_max": 6,
        "margin_max": 3,
    },

    "serie_a": {
        # Data
        "schedule_function": espn_soccer_scoreboard,
        "statistics_function": espn_seriea_summary,
        "league": "ita.1",
        "output": "data/raw/serie_a_games.csv",
        "extra_features": [
            "shots",
            "shots_on_target",
            "possession",
            "passes",
            "pass_accuracy",
            "fouls",
            "yellow_cards",
            "red_cards",
            "offsides",
            "corner_kicks",
            "saves",
        ],
        "performance_window": 38 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -3,
        "point_diff_max": 3,
        "total_points_min": 1,
        "total_points_max": 6,
        "margin_max": 3,
    },

    "bundesliga": {
        # Data
        "schedule_function": espn_soccer_scoreboard,
        "statistics_function": espn_bundesliga_summary,
        "league": "ger.1",
        "output": "data/raw/bundesliga_games.csv",
        "extra_features": [
            "shots",
            "shots_on_target",
            "possession",
            "passes",
            "pass_accuracy",
            "fouls",
            "yellow_cards",
            "red_cards",
            "offsides",
            "corner_kicks",
            "saves",
        ],
        "performance_window": 34 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -3,
        "point_diff_max": 3,
        "total_points_min": 1,
        "total_points_max": 6,
        "margin_max": 3,
    },

    "ligue_1": {
        # Data
        "schedule_function": espn_soccer_scoreboard,
        "statistics_function": espn_ligue1_summary,
        "league": "fra.1",
        "output": "data/raw/ligue_1_games.csv",
        "extra_features": [
            "shots",
            "shots_on_target",
            "possession",
            "passes",
            "pass_accuracy",
            "fouls",
            "yellow_cards",
            "red_cards",
            "offsides",
            "corner_kicks",
            "saves",
        ],
        "performance_window": 34 * NUMBER_OF_SEASONS,

        # Slop config
        "point_diff_min": -3,
        "point_diff_max": 3,
        "total_points_min": 1,
        "total_points_max": 6,
        "margin_max": 3,
    },
}