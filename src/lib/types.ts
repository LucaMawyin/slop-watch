export type Game = {

    // Game information
    game_id: string;
    league: string;
    date: string;
    home_name: string;
    away_name: string;
    venue_full_name: string;
    is_postseason: number;

    // Score
    home_score:number;
    away_score:number;

    // Slop
    predicted_slop: number;
    actual_slop: number | null;
    slop_percentile: number;

    // Watchability
    predicted_watchability: number;
    actual_watchability: number | null;
    watchability_percentile: number;

    // Season performance
    home_win_pct: number;
    away_win_pct: number;
    home_point_diff: number;
    away_point_diff: number;

    // Recent performance
    home_recent_win_pct: number;
    away_recent_win_pct: number;
    home_recent_point_diff: number;
    away_recent_point_diff: number;
};

export type TeamGame = {
    game_id: string;
    date: string;
    home_name: string;
    away_name: string;
    venue_full_name: string | null;
    season: string;
    is_postseason: number;
    home_score: number | null;
    away_score: number | null;
};

export type Team = {
    team: string;
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