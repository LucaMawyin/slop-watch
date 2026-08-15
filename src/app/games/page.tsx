"use client";

import { useEffect, useState } from "react";

type Game = {
    game_id: string;
    date: string;

    home_name: string;
    away_name: string;

    predicted_slop: number;

    home_win_pct: number;
    away_win_pct: number;

    home_point_diff: number;
    away_point_diff: number;

    home_recent_win_pct: number;
    away_recent_win_pct: number;

    home_recent_point_diff: number;
    away_recent_point_diff: number;
};

export default function Games() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const league = params.get("league") || "nba";

        fetch(`http://127.0.0.1:5000/api/games?league=${league}`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to fetch games");
                }

                return res.json();
            })
            .then((data) => {
                console.log("Flask response:", data);
                const games = data as Game[];

                setGames(games);
                setLoading(false);
            })
            .catch(() => {
                setError("Unable to load games.");
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div>Loading games...</div>;
    }

    if (error) {
        return (
            <main className="min-h-screen bg-zinc-950 p-6 text-white">
                <p className="text-red-400">{error}</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-zinc-950 p-6 text-white">
            <h1 className="text-4xl font-bold">
                Upcoming Games
            </h1>

            {games.length === 0 ? (
                <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                    <p className="text-lg font-semibold">
                        No games found
                    </p>

                    <p className="mt-2 text-sm text-zinc-500">
                        There are no upcoming games for this league.
                    </p>
                </div>
            ) : (
                <div className="mt-8 space-y-4">
                    {games.map((game) => (
                        <div
                            key={game.game_id}
                            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
                        >
                            <div className="flex justify-between">
                                <div>
                                    {game.away_name} @ {game.home_name}
                                </div>

                                <div>
                                    {game.predicted_slop.toFixed(3)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}