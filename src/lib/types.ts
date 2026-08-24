export type Game = {
    game_id: string;
    date: string;
    venue_full_name: string;

    home_name: string;
    away_name: string;

    predicted_slop: number;
    actual_slop:number | null;

    home_win_pct: number;
    away_win_pct: number;

    home_point_diff: number;
    away_point_diff: number;

    home_recent_win_pct: number;
    away_recent_win_pct: number;

    home_recent_point_diff: number;
    away_recent_point_diff: number;
};