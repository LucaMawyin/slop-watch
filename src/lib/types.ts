export type Game = {
    // Game information
    game_id: string;
    league: string;
    date: string;

    month: number;
    day: number;
    year: number;

    home_id: string;
    away_id: string;

    home_name: string;
    away_name: string;

    home_full_name: string;
    away_full_name: string;

    venue_full_name: string;

    is_postseason: number;
    season: string;

    // Score
    home_score: number | null;
    away_score: number | null;

    // Pregame Slop
    predicted_slop: number;
    actual_slop: number | null;
    slop_percentile: number;

    // Pregame Watchability
    predicted_watchability: number;
    actual_watchability: number | null;
    watchability_percentile: number;

    // Live
    live_slop: number | null;
    live_watchability: number | null;

    // Season performance
    home_win_pct: number;
    home_point_diff: number;

    away_win_pct: number;
    away_point_diff: number;

    // Recent performance
    home_recent_win_pct: number;
    home_recent_point_diff: number;

    away_recent_win_pct: number;
    away_recent_point_diff: number;

    // Playoffs
    home_playoff_wins: number;
    away_playoff_wins: number;
    playoff_wins: number;

    // Season record
    home_season_wins: number;
    home_season_losses: number;
    home_season_win_pct: number;
    home_season_point_diff: number;

    away_season_wins: number;
    away_season_losses: number;
    away_season_win_pct: number;
    away_season_point_diff: number;

    // Badness
    home_win_badness: number;
    away_win_badness: number;

    home_point_diff_badness: number;
    away_point_diff_badness: number;

    home_badness: number;
    away_badness: number;
    team_badness: number;

    // Scoring
    total_points: number;
    scoring_mean: number;
    scoring_std: number;
    ideal_scoring: number;
    scoring_badness: number;

    actual_margin: number;

    // Watchability components
    team_quality: number;
    competitiveness: number;
    uncompetitiveness: number;
    scoring_entertainment: number;

    team_quality_weight: number;
    competitiveness_weight: number;
    scoring_weight: number;

    uncompetitiveness_weight: number;
    team_weight: number;

    // Recent games
    home_recent_games: Game[] | null;
    away_recent_games: Game[] | null;
};

export type TeamGame = {
    game_id: string;
    date: string;
    home_name: string;
    home_full_name: string;
    away_name: string;
    away_full_name: string;
    venue_full_name: string | null;
    season: string;
    is_postseason: number;
    home_score: number | null;
    away_score: number | null;
};

export type Team = {
    team: {
        name: string;
        full_name: string;
    };
    team_badness: number;
    league: string;
    season: string;

    record: {
        wins: number;
        losses: number;
    };

    win_pct: number;
    point_diff: number;
    games_played: number;

    recent_games: Game[];
    upcoming_games: Game[];
};