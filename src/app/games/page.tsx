"use client";

import { addToCalendar } from "@/lib/addToCalendar";
import { addToGoogleCalendar, addToICS, addToOutlook } from "@/lib/calendar";
import { getSlopBadge } from "@/lib/getSlopBadge";
import { Game } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Games() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [calendarGame, setCalendarGame] = useState<Game | null>(null);
    const [sortBy, setSortBy] = useState<"slop" | "date">("slop");

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
        return (
            <main className="min-h-screen bg-zinc-950 p-6 text-white">
                <div className="text-zinc-400">
                    Loading games...
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-zinc-950 p-6 text-white">
                <p className="text-red-400">{error}</p>
            </main>
        );
    }

    const sortedGames = [...games].sort((a, b) => {
        if (sortBy === "slop") {
            return b.predicted_slop - a.predicted_slop;
        }

        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return (
        <main className="min-h-screen bg-zinc-950 p-6 text-white">

            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold">
                    Upcoming Games
                </h1>

                <select
                    value={sortBy}
                    onChange={(e) =>
                        setSortBy(e.target.value as "slop" | "date")
                    }
                    className="
                        rounded-lg
                        border
                        border-zinc-800
                        bg-zinc-900
                        px-3
                        py-2
                        text-sm
                        text-zinc-200
                        outline-none
                    "
                >
                    <option value="slop">Sort by Slop</option>
                    <option value="date">Sort by Date</option>
                </select>
            </div>

            {games.length === 0 ? (
                <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                    <p className="text-lg font-semibold">
                        No games found
                    </p>

                    <p className="mt-2 text-sm text-zinc-500">
                        There are no upcoming games for this league.
                    </p>

                    <Link
                        className="mt-2 inline-block"
                        href="/"
                    >
                        &lt; Return to Home
                    </Link>
                </div>

            ) : (
                <div className="
                    mt-8 
                    grid 
                    auto-rows-fr
                    grid-cols-1 
                    gap-4 
                    sm:grid-cols-2 
                    lg:grid-cols-3
                ">
                    {sortedGames.map((game) => {
                        const badge = getSlopBadge(game.predicted_slop);

                        return (
                            <div
                                key={game.game_id}
                                className="
                                    rounded-xl 
                                    border 
                                    border-zinc-800
                                    bg-zinc-900 p-5
                                "
                            >
                                <div className="flex items-start justify-between pb-2">
                                    <div className="text-sm text-zinc-400">
                                        {new Date(game.date).toLocaleString([], {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                        })}
                                    </div>

                                    <div
                                        className={`
                                            rounded-full
                                            border 
                                            px-3 
                                            py-1 
                                            text-xs 
                                            font-medium 
                                            ${badge.className}
                                        `}
                                    >
                                        {badge.title}
                                    </div>
                                </div>

                                <div className="flex justify-between">
                                    <div>
                                        <div className="mb-1 text-xs text-zinc-500">
                                            HOME
                                        </div>
                                        <div className="text-2xl font-semibold">
                                            {game.home_name}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="mb-1 text-xs text-zinc-500">
                                            AWAY
                                        </div>
                                        <div className="text-2xl font-semibold">
                                            {game.away_name}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 border-t border-zinc-800 pt-4 text-center">
                                    <div className="text-xs text-zinc-500">
                                        SLOP SCORE
                                    </div>

                                    <div className="text-2xl font-bold">
                                        {(game.predicted_slop * 100).toFixed(1)}%
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <button
                                        onClick={() => setCalendarGame(game)}
                                        className="
                                            mt-4
                                            w-full
                                            rounded-lg
                                            border
                                            border-zinc-700
                                            bg-zinc-800
                                            px-4
                                            py-2
                                            text-sm
                                            font-medium
                                            text-zinc-200
                                            transition
                                            hover:bg-zinc-700
                                        "
                                    >
                                        Add to Calendar
                                    </button>
                                </div>
                                
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ADD TO CALENDAR POPUP */}
            {calendarGame && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setCalendarGame(null)}
                >
                    <div
                        className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                Add to Calendar
                            </h2>

                            <button
                                onClick={() => setCalendarGame(null)}
                                className="text-zinc-500 transition hover:text-zinc-300"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mt-2 text-sm text-zinc-400">
                            {calendarGame.away_name} @ {calendarGame.home_name}
                        </div>

                        <div className="mt-5 space-y-2">
                            <button
                                onClick={() => {
                                    addToICS(calendarGame);
                                    setCalendarGame(null);
                                }}
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-zinc-700
                                    bg-zinc-800
                                    px-4
                                    py-3
                                    text-left
                                    transition
                                    hover:border-zinc-600
                                    hover:bg-zinc-700
                                "
                            >
                                <div className="font-medium">
                                    Apple Calendar
                                </div>
                                <div className="text-xs text-zinc-500">
                                    Download .ics file
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    addToGoogleCalendar(calendarGame);
                                    setCalendarGame(null);
                                }}
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-zinc-700
                                    bg-zinc-800
                                    px-4
                                    py-3
                                    text-left
                                    transition
                                    hover:border-zinc-600
                                    hover:bg-zinc-700
                                "
                            >
                                <div className="font-medium">
                                    Google Calendar
                                </div>
                                <div className="text-xs text-zinc-500">
                                    Open Google Calendar
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    addToOutlook(calendarGame);
                                    setCalendarGame(null);
                                }}
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-zinc-700
                                    bg-zinc-800
                                    px-4
                                    py-3
                                    text-left
                                    transition
                                    hover:border-zinc-600
                                    hover:bg-zinc-700
                                "
                            >
                                <div className="font-medium">
                                    Outlook
                                </div>
                                <div className="text-xs text-zinc-500">
                                    Open Outlook Calendar
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>

    );
}


