"use client";

import { getSlopBadge } from "@/lib/getSlopBadge";
import { Game } from "@/lib/types";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DayPickerClient from "@/components/DayPicker";
import Badge from "@/components/Badge";
import GamesSkeleton from "@/components/GamesSkeleton";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { leagues } from "@/lib/leagues";
import { getHeatColour } from "@/lib/getHeatColour";
import ProgressCircle from "@/components/ProgressCircle";
import { slugify } from "@/lib/slugify";
import AddToCalendar from "@/components/AddToCalendar";
import useSwipeNavigation from "@/lib/useSwipeNavigation";

function GamesContent() {

    const formatDate = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<
        "slop" | "date" | "watchability" | "overall" | "live"
    >("live");
    const [visibleCount, setVisibleCount] = useState(9);
    const [ sortDirection, setSortDirection ] = useState("asc");

    const router = useRouter();
    const searchParams = useSearchParams();
    const sport = searchParams.get("sport")?.toLowerCase();
    const league = searchParams.get("league");
    const displayName = leagues.find((item) => item.id === league)?.name || sport;

    const DEFAULT_LEAGUE_DAYS = 1;
    const DEFAULT_SPORT_DAYS = 1;
    const DEFAULT_ALL_DAYS = 1;

    const defaultDays = sport
        ? DEFAULT_SPORT_DAYS - 1
        : league
            ? DEFAULT_LEAGUE_DAYS - 1
            : DEFAULT_ALL_DAYS - 1;

    const start = searchParams.get("start");
    const end = searchParams.get("end");

    // Normalize date range
    let effectiveStart = start;
    let effectiveEnd = end;

    if (!effectiveStart && !effectiveEnd) {
        effectiveStart = formatDate(new Date());
    }

    else if (!effectiveStart && effectiveEnd) {
        effectiveStart = effectiveEnd;
    }

    if (!effectiveEnd) {
        const defaultEnd = new Date();

        defaultEnd.setDate(
            defaultEnd.getDate() + defaultDays
        );

        effectiveEnd = formatDate(defaultEnd);
    }

    if (
        effectiveStart &&
        effectiveEnd &&
        effectiveStart > effectiveEnd
    ) {
        [effectiveStart, effectiveEnd] = [
            effectiveEnd,
            effectiveStart,
        ];
    }

    const ref = start && end
        ? `${start}_${end}`
        : (start ? start : formatDate(new Date()));

    const getShiftedDateUrl = (days: number) => {
        const startDate = new Date(
            `${effectiveStart ?? formatDate(new Date())}T00:00:00`
        );

        const endDate = new Date(
            `${effectiveEnd ?? effectiveStart ?? formatDate(new Date())}T00:00:00`
        );

        if (
            isNaN(startDate.getTime()) ||
            isNaN(endDate.getTime())
        ) {
            return "/games";
        }

        // Shift both dates while preserving the selected range.
        startDate.setDate(startDate.getDate() + days);
        endDate.setDate(endDate.getDate() + days);

        const params = new URLSearchParams(searchParams.toString());

        params.set("start", formatDate(startDate));
        params.set("end", formatDate(endDate));

        return `/games?${params.toString()}`;
    };

    const swipeHandlers = useSwipeNavigation({
        onSwipeLeft: () => router.push(getShiftedDateUrl(1)),
        onSwipeRight: () => router.push(getShiftedDateUrl(-1)),
    });

    // Reset filters on reload
    useEffect(() => {
        setSortBy("live");
        setSortDirection("asc");
    }, [sport, league]);

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setVisibleCount(9);
        setError(null);

        const params = new URLSearchParams();

        if (sport) {
            params.set("sport", slugify(sport));
        } else if (league) {
            params.set("league", league);
        }

        if (effectiveStart) {
            params.set("start", effectiveStart);
        }

        if (effectiveEnd) {
            params.set("end", effectiveEnd);
        }

        fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/games?${params.toString()}`,
            {
                signal: controller.signal,
            }
        )
            .then(async (res) => {
                const data: { error?: string } | Game[] =
                    await res.json();

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
                const filteredGames = (data as Game[]).filter((game) => {
                    const gameDate = new Date(game.date);

                    const localGameDate =
                        `${gameDate.getFullYear()}-${String(
                            gameDate.getMonth() + 1
                        ).padStart(2, "0")}-${String(
                            gameDate.getDate()
                        ).padStart(2, "0")}`;

                    if (
                        effectiveStart &&
                        localGameDate < effectiveStart
                    ) {
                        return false;
                    }

                    if (
                        effectiveEnd &&
                        localGameDate > effectiveEnd
                    ) {
                        return false;
                    }

                    return true;
                });

                setGames(filteredGames);
                setLoading(false);
            })
            .catch((err) => {
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

    const gamesRef = useRef<Game[]>([]);

    useEffect(() => {
        gamesRef.current = games;
    }, [games]);

    useEffect(() => {
        if (games.length === 0) {
            return;
        }

        const updateLiveGames = async () => {
            const now = new Date();

            const liveGames = gamesRef.current.filter((game) => {
                const gameDate = new Date(game.date);
                const age = now.getTime() - gameDate.getTime();

                return (
                    age >= 30 * 60 * 1000 &&
                    age <= 6 * 60 * 60 * 1000
                );
            });

            for (const game of liveGames) {
                try {
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/game/${game.game_id}/score?league=${game.league}&date=${encodeURIComponent(game.date)}`,
                        {
                            cache: "no-store",
                        }
                    );

                    if (!response.ok) {
                        continue;
                    }

                    const liveGame = await response.json() as Game;

                    setGames((currentGames) =>
                        currentGames.map((currentGame) =>
                            String(currentGame.game_id) === String(liveGame.game_id)
                                ? {
                                    ...currentGame,
                                    home_score: liveGame.home_score,
                                    away_score: liveGame.away_score,
                                }
                                : currentGame
                        )
                    );

                } catch (error) {
                    console.error(
                        `Failed to update live game ${game.game_id}:`,
                        error
                    );
                }
            }
        };

        // Run after the games have rendered.
        updateLiveGames();

        // Continue updating every 2 minutes.
        const interval = setInterval(
            updateLiveGames,
            2 * 60 * 1000
        );

        return () => {
            clearInterval(interval);
        };
    }, [games.length]);

    const sortedGames = [...games].sort((a, b) => {
        let comparison: number;

        if (sortBy === "live") {
            const aLive =
                new Date(a.date) <= new Date() &&
                a.actual_slop === null;

            const bLive =
                new Date(b.date) <= new Date() &&
                b.actual_slop === null;

            comparison = Number(bLive) - Number(aLive);

            // If both have the same live status sort by date
            if (comparison === 0) {
                comparison =
                    new Date(a.date).getTime() -
                    new Date(b.date).getTime();
            }
        }

        else if (sortBy === "slop") {
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
        <main 
            className="p-6 text-white"
            {...swipeHandlers}
        >

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
                    <div className="
                            flex 
                            items-center 
                            justify-center
                            gap-3
                            w-full
                            sm:w-fit
                        "
                    >
                        <Link
                            href={getShiftedDateUrl(-1)}
                            aria-label="Previous day"
                            className="flex items-center justify-center rounded-lg border border-gray-300 p-2 transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                            <ChevronLeft size={20} />
                        </Link>

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

                                const formatDate = (date: Date) =>
                                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

                                params.set("start", formatDate(range.from));
                                params.set("end", formatDate(range.to));

                                window.location.href = `/games?${params.toString()}`;
                            }}
                        />

                        <Link
                            href={getShiftedDateUrl(1)}
                            aria-label="Next day"
                            className="flex items-center justify-center rounded-lg border border-gray-300 p-2 transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                            <ChevronRight size={20} />
                        </Link>
                    </div>

                    <div className="
                        flex 
                        items-center 
                        justify-center
                        gap-3
                        w-full
                        sm:w-fit
                    ">
                        {/* SLOP | DATE | WATCHABILITY */}
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) =>{
                                    const value = e.target.value as 
                                        "slop" 
                                        | "date" 
                                        | "watchability" 
                                        | "overall"
                                        | "live";

                                    setSortBy(value);
                                    setSortDirection(
                                        value === "slop" || value === "overall" 
                                        ? "desc" 
                                        : "asc"
                                    );
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
                                <option value="live">Sort by Live</option>
                                <option value="date">Sort by Date</option>
                                <option value="slop">Sort by Slop</option>
                                <option value="watchability">Sort by Watchability</option>
                                <option value="overall">Sort by Overall</option>

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
                            const watchability = game.watchability_percentile;

                            const slopColour = getHeatColour(slop);
                            const watchabilityColour = getHeatColour(1-watchability);

                            const badge = getSlopBadge(slop, watchability);
                            const currentLeague = leagues.find((item) => item.id === game.league)?.id;


                            return (
                                <a
                                    key={game.game_id}
                                    className="
                                        flex
                                        flex-col
                                        rounded-xl
                                        border
                                        border-zinc-800
                                        bg-zinc-900
                                        p-5
                                        no-underline!
                                        group
                                        hover:text-white!
                                        hover:border-zinc-700
                                        hover:bg-zinc-800
                                        transition-colors
                                        duration-200
                                    "
                                    href={`/${currentLeague}/preview/${game.game_id}?date=${game.date.slice(0, 10)}${ref ? `&ref=${ref}` : ""}`}
                                    target="_blank"
                                >
                                    <div className="flex items-center justify-between pb-2">
                                        <div className="text-sm text-zinc-400 max-w-1/2">
                                            {new Date(game.date).toLocaleString([], {
                                                weekday: "short",
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })}
                                        </div>

                                        <Badge
                                            title={badge.title}
                                            x={3}
                                            y={1}
                                            colour={badge.colour}
                                        />
                                    </div>

                                    {(sport || (!league && !sport)) && currentLeague && (
                                        <div className="mb-3 text-lg font-semibold text-white">
                                            <div
                                                onClick={() => window.open(
                                                    `/games?league=${currentLeague}`,
                                                    "_blank"
                                                )}
                                            >
                                                {leagues.find((item) => item.id === game.league)?.name}
                                            </div>
                                            
                                        </div>
                                    )}

                                    <div className="flex justify-between">
                                        <div className="max-w-[50%]">
                                            <div className="mb-1 text-xs text-zinc-500">
                                                HOME
                                            </div>
                                            <div
                                                onClick={() => window.open(
                                                    `/${currentLeague}/teams/${slugify(game.home_name)}?id=${game.home_id}${ref ? `&ref=${ref}` : ""}`,
                                                    "_blank"
                                                )}
                                                className="text-xl font-semibold"
                                            >
                                                {game.home_name}
                                            </div>
                                        </div>

                                        <div className="text-right max-w-[50%]">
                                            <div className="mb-1 text-xs text-zinc-500">
                                                AWAY
                                            </div>
                                            <div
                                                onClick={() => window.open(
                                                    `/${currentLeague}/teams/${slugify(game.away_name)}?id=${game.away_id}${ref ? `&ref=${ref}` : ""}`,
                                                    "_blank"
                                                )}
                                                className="text-xl font-semibold"
                                            >
                                                {game.away_name}
                                            </div>
                                        </div>
                                    </div>

                                    {(new Date(game.date) <= new Date() || game.actual_slop !== null) && (
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
                                                title={game.actual_slop !== null ? "FINAL" : "LIVE"}
                                                x={3}
                                                y={1}
                                                className="border-none"
                                                bgColour={
                                                    game.actual_slop !== null
                                                        ? "bg-sky-950"
                                                        : "bg-green-950"
                                                }
                                                textColour={
                                                    game.actual_slop !== null
                                                        ? "text-sky-400"
                                                        : "text-green-400"
                                                }
                                            >
                                                {game.actual_slop === null && (
                                                    <span className="
                                                        h-1.5
                                                        w-1.5
                                                        animate-pulse
                                                        rounded-full
                                                        bg-green-400
                                                    " />
                                                )}
                                            </Badge>

                                            <div className="text-3xl font-semibold">
                                                {game.away_score}
                                            </div>
                                        </div>
                                    )}

                                    <div className="my-auto">
                                        <div className="my-3 text-center text-sm text-zinc-500">
                                            {game.venue_full_name}
                                        </div>

                                        <div className="flex flex-wrap justify-evenly border-t border-zinc-800 pt-4 text-center mb-6">
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
                                    </div>



                                    <div className="space-y-4">
                                        <div
                                            onClick={() => window.open(
                                                `/${currentLeague}/preview/${game.game_id}?date=${game.date.slice(0, 10)}${ref ? `&ref=${ref}` : ""}`,
                                                "_blank"
                                            )}
                                            className="
                                                block
                                                w-full
                                                rounded-lg
                                                bg-zinc-200
                                                px-4
                                                py-2
                                                text-center
                                                text-sm
                                                font-medium
                                                text-zinc-900!
                                                transition
                                                hover:bg-white
                                                no-underline!
                                            "
                                        >
                                            View Game
                                        </div>

                                        {game.actual_slop === null && 
                                            new Date(game.date) >= new Date() && (
                                                <AddToCalendar game={game} />
                                            )
                                        }
                                    </div>
                                </a>
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