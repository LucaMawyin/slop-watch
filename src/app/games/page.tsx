"use client";

import { addToGoogleCalendar, addToICS, addToOutlook } from "@/lib/calendar";
import { getSlopBadge } from "@/lib/getSlopBadge";
import { Game } from "@/lib/types";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DayPickerClient from "@/components/DayPicker";
import Badge from "@/components/Badge";
import GamesSkeleton from "@/components/GamesSkeleton";
import { ChevronDown } from "lucide-react";
import { leagues } from "@/lib/leagues";
import { getHeatColour } from "@/lib/getHeatColour";
import ProgressCircle from "@/components/ProgressCircle";

function GamesContent() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [calendarGame, setCalendarGame] = useState<Game | null>(null);
    const [sortBy, setSortBy] = useState<"slop" | "date" | "watchability" | "overall">("date");    
    const [visibleCount, setVisibleCount] = useState(9);
    const [ sortDirection, setSortDirection ] = useState("asc");

    const searchParams = useSearchParams();
    const sport = searchParams.get("sport")?.toLowerCase();
    const league = searchParams.get("league");
    const displayName = leagues.find((item) => item.id === league)?.name || sport;

    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const DEFAULT_LEAGUE_DAYS = 7;
    const DEFAULT_SPORT_DAYS = 3;
    const DEFAULT_ALL_DAYS = 2;

    const defaultDays = sport
        ? DEFAULT_SPORT_DAYS - 1
        : league
            ? DEFAULT_LEAGUE_DAYS - 1
            : DEFAULT_ALL_DAYS - 1;

    // Reset filters on reload
    useEffect(() => {
        setSortBy("date");
        setSortDirection("asc");
    }, [sport, league]);

    useEffect(() => {

        const controller = new AbortController();

        setLoading(true);
        setVisibleCount(9);
        setError(null);

        const params = new URLSearchParams();

        // Fetching sport or league
        if (sport) {
            params.set("sport", sport)
        } 
        
        else if (league) {
            params.set("league", league);
        }

        
        // Time frame 
        if (start) {
            params.set("start", start);
        }

        if (end) {
            params.set("end", end);
        }   else {
            const defaultEnd = new Date();

            defaultEnd.setDate(
                defaultEnd.getDate() + defaultDays
            );

            params.set(
                "end",
                defaultEnd.toISOString().split("T")[0]
            );
        }

        fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/games?${params.toString()}`,
            {
                signal: controller.signal,
            }
        )
            .then(async (res) => {
                const data: { error?: string } | Game[] = await res.json();

                if (!res.ok) {
                    throw new Error(
                        "error" in data && data.error
                            ? data.error
                            : "Failed to fetch games"
                    );
                }

                return data;
            })
            .then((data) => {
                setGames(data as Game[]);
                setLoading(false);
            })
            .catch((err) => {
                // Ignore intentionally aborted requests
                if (err.name === "AbortError") {
                    return;
                }

                setError(err.message);
                setLoading(false);
            });
        return () => {
            controller.abort();
        };
    }, [league, sport, start, end, defaultDays]);

    const sortedGames = [...games].sort((a, b) => {
        let comparison: number;

        if (sortBy === "slop") {
            const aSlop = a.slop_percentile;
            const bSlop = b.slop_percentile;

            comparison = aSlop - bSlop;
        }

        else if (sortBy === "watchability") {
            const aWatchability = a.watchability_percentile;
            const bWatchability = b.watchability_percentile;

            comparison = aWatchability - bWatchability;
        }

        else if (sortBy === "overall") {
            const aOverall = 1 - (a.slop_percentile * (1 - a.watchability_percentile));
            const bOverall = 1- (b.slop_percentile * (1 - b.watchability_percentile));

            comparison = aOverall - bOverall;
        }

        else {
            comparison = 
                new Date(a.date).getTime() - 
                new Date(b.date).getTime();
        }

        return sortDirection === "asc" 
            ? comparison
            : -comparison
    });

    return (
        <main className="p-6 text-white">

            {/* HEADER */}
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
                    {displayName
                        ? `Upcoming ${displayName.charAt(0).toUpperCase() + displayName.slice(1)} Games`
                        : "All Upcoming Games"
                    }
                </h1>

                {/* FILTERS */}
                <div className="
                    flex
                    w-full
                    flex-wrap
                    items-center
                    justify-between
                    gap-3
                    sm:w-auto
                ">

                    {/* DATE RANGE */}
                    <DayPickerClient
                        initialMonth={
                            start 
                                ? new Date(`${start}T00:00:00`) 
                                : new Date()
                        }
                        initialRange={
                            start && end
                                ? {
                                    from: new Date(`${start}T00:00:00`),
                                    to: new Date(`${end}T00:00:00`),
                                }
                                : {
                                    from: new Date(),
                                    to: new Date(
                                        new Date().setDate(
                                            new Date().getDate() + defaultDays
                                        )
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

                    <div className="flex relative gap-3">
                        {/* SLOP | DATE | WATCHABILITY */}
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) =>{
                                    const value = e.target.value as "slop" | "date" | "watchability" | "overall";

                                    setSortBy(value);
                                    setSortDirection(value === "slop" || value === "overall" ? "desc" : "asc");
                                }}
                                className="
                                    appearance-none
                                    rounded-lg
                                    px-3
                                    py-2
                                    pr-9
                                    text-sm
                                    outline-none
                                    transition
                                    border
                                    border-zinc-700
                                    text-zinc-200
                                    bg-zinc-900
                                    hover:border-zinc-600
                                    focus:border-zinc-500
                                "
                            >
                                <option value="slop">Sort by Slop</option>
                                <option value="watchability">Sort by Watchability</option>
                                <option value="overall">Sort by Overall</option>
                                <option value="date">Sort by Date</option>

                            </select>
                            <ChevronDown
                                size={16}
                                className="
                                    pointer-events-none
                                    absolute
                                    right-3
                                    top-1/2
                                    -translate-y-1/2
                                    text-zinc-400
                                "
                            />
                        </div>

                        {/* ASC | DESC */}
                        <div className="relative">
                            <select
                                value={sortDirection}
                                onChange={(e) =>
                                    setSortDirection(e.target.value as "asc" | "desc")
                                }
                                className="
                                    appearance-none
                                    rounded-lg
                                    px-3
                                    py-2
                                    pr-9
                                    text-sm
                                    outline-none
                                    transition
                                    border
                                    border-zinc-700
                                    text-zinc-200
                                    bg-zinc-900
                                    hover:border-zinc-600
                                    focus:border-zinc-500
                                "
                            >
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>

                            <ChevronDown
                                size={16}
                                className="
                                    pointer-events-none
                                    absolute
                                    right-3
                                    top-1/2
                                    -translate-y-1/2
                                    text-zinc-400
                                "
                            />
                        </div>                        
                    </div>

                </div>
            </div>

            {loading ? (
                <GamesSkeleton showLeague={!!sport}/>
            ) : error ? (
                <p className="mt-4 text-red-400!">{error}</p>
            ) : games.length === 0 ? (
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

                            const slop = game.slop_percentile;
                            const slopColour = getHeatColour(slop);

                            const watchability = game.watchability_percentile;
                            const watchabilityColour = getHeatColour(1-watchability);

                            const badge = getSlopBadge(slop, watchability);


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
                                    <div className="flex items-center justify-between pb-2">
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
                                            colour={slopColour}
                                        />
                                    </div>

                                    {(sport || (!league && !sport))  && (
                                        <div className="mb-3 text-lg font-semibold text-white">
                                            {leagues.find((item) => item.id === game.league)?.name}
                                        </div>
                                    )}

                                    <div className="flex justify-between">
                                        <div className="max-w-[50%]">
                                            <div className="mb-1 text-xs text-zinc-500">
                                                HOME
                                            </div>
                                            <div className="text-xl font-semibold">
                                                {game.home_name}
                                            </div>
                                        </div>

                                        <div className="text-right max-w-[50%]">
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
                                                borderColour="border-sky-700"
                                                bgColour="bg-sky-950"
                                                textColour="text-sky-400"
                                            />
                                            <div className="text-3xl font-semibold">
                                                {game.away_score}
                                            </div>
                                        </div>
                                    )}

                                    <div className="my-3 text-center text-sm text-zinc-500">
                                        {game.venue_full_name}
                                    </div>

                                    <div className="flex flex-wrap justify-evenly border-t border-zinc-800 pt-4 text-center">
                                        <div>
                                            <div className="text-xs text-zinc-500">
                                                SLOP SCORE
                                            </div>

                                            <div className="relative mx-auto mt-3 h-24 w-24">
                                                <ProgressCircle
                                                    progress={slop}
                                                    progressColour={slopColour}
                                                />

                                                <div 
                                                    className="
                                                        absolute
                                                        inset-0
                                                        flex
                                                        items-center
                                                        justify-center
                                                        text-xl
                                                        font-bold
                                                    "
                                                    style={{ color: slopColour }}
                                                >
                                                    {(slop * 100).toFixed(1)}%
                                                </div>
                                            </div>                                            
                                        </div>

                                        <div>
                                            <div className="text-xs text-zinc-500">
                                                WATCHABILITY
                                            </div>

                                            <div className="relative mx-auto mt-3 h-24 w-24">
                                                <ProgressCircle
                                                    progress={watchability}
                                                    progressColour={watchabilityColour}
                                                />

                                                <div 
                                                    className="
                                                        absolute
                                                        inset-0
                                                        flex
                                                        items-center
                                                        justify-center
                                                        text-xl
                                                        font-bold
                                                    "
                                                    style={{ color: watchabilityColour }}
                                                >
                                                    {(watchability * 100).toFixed(1)}%
                                                </div>
                                            </div>                                            
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