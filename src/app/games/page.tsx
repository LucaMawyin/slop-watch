"use client";

import { addToGoogleCalendar, addToICS, addToOutlook } from "@/lib/calendar";
import { getSlopBadge } from "@/lib/getSlopBadge";
import { Game } from "@/lib/types";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DayPickerClient from "@/components/DayPicker";
import Badge from "@/components/Badge";

function GamesContent() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [calendarGame, setCalendarGame] = useState<Game | null>(null);
    const [sortBy, setSortBy] = useState<"slop" | "date">("date");    
    const [visibleCount, setVisibleCount] = useState(9);

    const searchParams = useSearchParams();
    const league = searchParams.get("league") || "nba";
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    useEffect(() => {
        setLoading(true);
        setVisibleCount(9);

        const params = new URLSearchParams();

        params.set("league", league);

        if (start) {
            params.set("start", start);
        }

        if (end) {
            params.set("end", end);
        }

        fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/games?${params.toString()}`
        )
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to fetch games");
                }

                return res.json();
            })
            .then((data) => {
                setGames(data as Game[]);
                setLoading(false);
            })
            .catch(() => {
                setError("Unable to load games.");
                setLoading(false);
            });
    }, [league, start, end]);

    if (loading) {
        return (
            <main className="p-6 text-white">
                <p className="">
                    Loading games...
                </p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="p-6 text-white">
                <p className="text-red-400">{error}</p>
            </main>
        );
    }

    const sortedGames = [...games].sort((a, b) => {
        if (sortBy === "slop") {
            const aSlop = a.actual_slop ?? a.predicted_slop;
            const bSlop = b.actual_slop ?? b.predicted_slop;

            return bSlop - aSlop;
        }

        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return (
        <main className="p-6 text-white">

            <div className="
                flex
                flex-wrap
                items-center
                justify-between
                gap-4
            ">
                <h1 className="
                    w-full
                    text-center
                    text-4xl
                    font-bold
                    sm:w-auto
                    sm:text-left
                ">
                    Upcoming Games
                </h1>

                <div className="
                    flex
                    w-full
                    flex-wrap
                    items-center
                    justify-between
                    gap-3
                    sm:w-auto
                ">
                    <DayPickerClient
                        initialRange={
                            start && end
                                ? {
                                    from: new Date(`${start}T00:00:00`),
                                    to: new Date(`${end}T00:00:00`),
                                }
                                : {
                                    from: new Date(),
                                    to: new Date(
                                        new Date().setDate(new Date().getDate() + 7)
                                    ),
                            }
                        }
                        onChange={(range) => {
                            if (!range?.from || !range?.to) return;

                            const params = new URLSearchParams(searchParams.toString());

                            params.set(
                                "start",
                                range.from.toISOString().split("T")[0]
                            );

                            params.set(
                                "end",
                                range.to.toISOString().split("T")[0]
                            );

                            window.location.href = `/games?${params.toString()}`;
                        }}
                    />

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
            </div>
            {games.length === 0 ? (
                <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                    <h2 className="text-lg font-semibold">
                        No games found
                    </h2>

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
                <>
                    <div className="
                        mt-8 
                        grid 
                        auto-rows-fr
                        grid-cols-1 
                        gap-4 
                        sm:grid-cols-2 
                        lg:grid-cols-3
                    ">
                        {sortedGames.slice(0, visibleCount).map((game) => {
                            const slop = game.actual_slop ?? game.predicted_slop;
                            const badge = getSlopBadge(slop);

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

                                        <Badge
                                            title={badge.title}
                                            x={3}
                                            y={1}
                                            borderColour={badge.borderColour}
                                            bgColour={badge.bgColour}
                                            textColour={badge.textColour}
                                        />
                                    </div>

                                    <div className="flex justify-between">
                                        <div>
                                            <div className="mb-1 text-xs text-zinc-500">
                                                HOME
                                            </div>
                                            <div className="text-xl font-semibold">
                                                {game.home_name}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="mb-1 text-xs text-zinc-500">
                                                AWAY
                                            </div>
                                            <div className="text-xl font-semibold">
                                                {game.away_name}
                                            </div>
                                        </div>
                                    </div>

                                    {game.actual_slop !== null && (
                                        <div className="
                                            mt-4 
                                            py-4
                                            flex                                  
                                            justify-between
                                            items-center
                                        ">
                                            <div className="text-3xl font-semibold">
                                                {game.home_score}
                                            </div>
                                            <Badge
                                                title="FINAL"
                                                x={3}
                                                y={1}
                                                borderColour="border-yellow-800"
                                                bgColour="bg-yellow-950"
                                                textColour="text-yellow-400"
                                            />
                                            <div className="text-3xl font-semibold">
                                                {game.away_score}
                                            </div>
                                        </div>
                                    )}

                                    <div className="my-3 text-center text-sm text-zinc-500">
                                        {game.venue_full_name}
                                    </div>

                                    <div className="border-t border-zinc-800 pt-4 text-center">

                                        <div className="text-xs text-zinc-500">
                                            SLOP SCORE
                                        </div>

                                        <div className="text-2xl font-bold">
                                            {(slop * 100).toFixed(1)}%
                                        </div>
                                    </div>

                                    {game.actual_slop === null && (
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
                                    )}  
                                </div>
                            )
                        })}
                    </div>
                    {visibleCount < sortedGames.length && (
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={() => setVisibleCount((count) => count + 9)}
                                className="
                                    rounded-lg
                                    border
                                    border-zinc-800
                                    bg-zinc-900
                                    px-5
                                    py-2.5
                                    text-sm
                                    font-medium
                                    text-zinc-200
                                    transition
                                    hover:border-zinc-700
                                    hover:bg-zinc-800
                                "
                            >
                                Show More
                            </button>
                        </div>
                    )}
                </>
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

export default function Games() {
    return (
        <Suspense
            fallback={
                <main className="p-6 text-white">
                    <div className="text-zinc-400">
                        Loading games...
                    </div>
                </main>
            }
        >
            <GamesContent />
        </Suspense>
    );
}