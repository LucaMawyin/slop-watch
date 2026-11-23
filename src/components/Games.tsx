"use client";

import { Game, LiveScore } from "@/lib/types";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import DayPickerClient from "@/components/DayPicker";
import GamesSkeleton from "@/components/GamesSkeleton";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { leagues } from "@/lib/leagues";
import { slugify } from "@/lib/slugify";
import useSwipeNavigation from "@/lib/useSwipeNavigation";
import FeaturedGameCard from "./FeaturedGameCard";

function GamesContent() {

    const formatDate = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const hasLoadedOnce = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());

    const [sortBy, setSortBy] = useState<
        "slop" 
        | "date" 
        | "watchability" 
        | "overall" 
        | "live" 
        | "watchable-slop"
    >("live");

    const [visibleCount, setVisibleCount] = useState(9);
    const [ sortDirection, setSortDirection ] = useState("desc");

    const router = useRouter();
    const searchParams = useSearchParams();
    const routeParams = useParams<{ league: string }>();

    const category = routeParams.league?.toLowerCase() ?? null;

    const league = leagues.some((item) => item.id === category)
        ? category
        : null;

    const sport = league ? null : category;

    const gamesBaseUrl = category
        ? `/${category}/games`
        : "/games";
        
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

    const navigationDates = useRef({
        start: effectiveStart!,
        end: effectiveEnd!,
    });

    const ref = start && end
        ? `${start}_${end}`
        : (start ? start : formatDate(new Date()));

    const getShiftedDateUrl = (days: number) => {
        const startDate = new Date(`${navigationDates.current.start}T00:00:00`);
        const endDate = new Date(`${navigationDates.current.end}T00:00:00`);

        startDate.setDate(startDate.getDate() + days);
        endDate.setDate(endDate.getDate() + days);

        const nextStart = formatDate(startDate);
        const nextEnd = formatDate(endDate);

        navigationDates.current = {
            start: nextStart,
            end: nextEnd,
        };

        const params = new URLSearchParams(window.location.search);

        params.set("start", nextStart);
        params.set("end", nextEnd);

        return `${window.location.pathname}?${params.toString()}`;
    };

    const {
        offset,
        dragging,
        direction,
        transitioning,
        transitionKey,
        resetting,
        finishTransition,
        navigate,
        ...swipeHandlers
    } = useSwipeNavigation({
        onSwipeLeft: () => router.push(getShiftedDateUrl(1)),
        onSwipeRight: () => router.push(getShiftedDateUrl(-1)),
    });

    const [loadedDateKey, setLoadedDateKey] = useState<string | null>(null);

    const dateKey = `${league ?? sport ?? "all"}:${effectiveStart}:${effectiveEnd}`;

    useEffect(() => {
        navigationDates.current = {
            start: effectiveStart!,
            end: effectiveEnd!,
        };
    }, [dateKey]);

    const currentVersion = useRef<{
        key: string;
        version: string;
    } | null>(null);

    // Reset filters on reload
    useEffect(() => {
        setSortBy("live");
        setSortDirection("desc");
    }, [sport, league]);

    useEffect(() => {
        const controller = new AbortController();

        let initialLoad = true;

        setLoading(true);

        setVisibleCount(9);
        setError(null);

        const loadGames = async () => {
            try {
                // Get current hourly dataset version
                const versionResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/version`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!versionResponse.ok) {
                    throw new Error("Failed to check data version.");
                }

                const { version } = await versionResponse.json() as any;
                const newVersion = String(version);

                if (
                    currentVersion.current?.key === dateKey &&
                    currentVersion.current.version === newVersion
                ) {
                    setLoading(false);
                    setLoadedDateKey(dateKey);
                    return;
                }

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

                params.set("version", newVersion);

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/games?${params}`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    const data: { error?: string } = await response.json();

                    throw new Error(
                        data.error || "Failed to fetch games."
                    );
                }

                const data: Game[] = await response.json();

                console.log("NEW GAMES DATA:", data.slice(0, 3).map(game => ({
                    game_id: game.game_id,
                    slop_percentile: game.slop_percentile,
                    watchability_percentile: game.watchability_percentile,
                })));

                if (controller.signal.aborted) return;

                const filteredGames = data.filter((game) => {
                    const gameDate = new Date(game.date);

                    const localGameDate =
                        `${gameDate.getFullYear()}-${String(
                            gameDate.getMonth() + 1
                        ).padStart(2, "0")}-${String(
                            gameDate.getDate()
                        ).padStart(2, "0")}`;

                    return (
                        (!effectiveStart || localGameDate >= effectiveStart) &&
                        (!effectiveEnd || localGameDate <= effectiveEnd)
                    );
                });

                // Display all games immediately
                currentVersion.current = {
                    key: dateKey,
                    version: newVersion,
                };

                setGames(filteredGames);
                setError(null);

                hasLoadedOnce.current = true;
                initialLoad = false;
                setLoading(false);
                setLoadedDateKey(dateKey);

                // Fetch scores in background
                // Prioritize games that appear first in live sort order
                const fetchInitialScores = async () => {
                    const liveGames = filteredGames
                        .filter((game) => {
                            return (
                                game.actual_slop == null &&
                                new Date(game.date).getTime() <= Date.now()
                            );
                        })
                        .sort(
                            (a, b) =>
                                new Date(a.date).getTime() -
                                new Date(b.date).getTime()
                        );

                    await Promise.allSettled(
                        liveGames.map(async (game) => {
                            const params = new URLSearchParams({
                                league: game.league,
                                date: game.date,
                            });

                            const response = await fetch(
                                `${process.env.NEXT_PUBLIC_API_URL}/api/game/${game.game_id}/score?${params}`,
                                {
                                    cache: "no-store",
                                    signal: controller.signal,
                                }
                            );

                            if (!response.ok) {
                                throw new Error(
                                    `Game ${game.game_id}: HTTP ${response.status}`
                                );
                            }

                            const score: LiveScore = await response.json();

                            if (controller.signal.aborted) return;

                            setGames((current) =>
                                current.map((item) =>
                                    item.game_id === game.game_id &&
                                    item.league === game.league
                                        ? {
                                            ...item,
                                            home_score: score.home_score ?? item.home_score,
                                            away_score: score.away_score ?? item.away_score,
                                            actual_slop: score.actual_slop ?? item.actual_slop,
                                            actual_watchability: score.actual_watchability ?? item.actual_watchability,
                                            watchability_percentile: score.watchability_percentile ?? item.watchability_percentile,
                                            slop_percentile: score.slop_percentile ?? item.slop_percentile,
                                        }
                                        : item
                                )
                            );
                        })
                    );
                };

                fetchInitialScores();
                setError(null);

            } catch (err) {
                if (
                    err instanceof Error &&
                    err.name === "AbortError"
                ) {
                    return;
                }

                console.error("Failed to load games:", err);

                if (initialLoad) {
                    initialLoad = false;
                    setLoading(false);
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Something went wrong."
                    );
                    setLoadedDateKey(dateKey);
                }
            }
        };

        // Initial load
        loadGames();

        // Check for new games every minute
        const interval = setInterval(
            loadGames,
            60 * 1000
        );

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [dateKey, league, sport, effectiveStart, effectiveEnd]);

    const gamesRef = useRef<Game[]>([]);

    useEffect(() => {
        gamesRef.current = games;
    }, [games]);

    useEffect(() => {
        if (loading || games.length === 0) return;

        const controller = new AbortController();

        let updating = false;

        const updateLiveGames = async () => {
            if (updating) return;

            updating = true;

            try {
                const liveGames = gamesRef.current
                    .filter((game) => {
                        return (
                            game.actual_slop == null &&
                            new Date(game.date).getTime() <= Date.now()
                        );
                    })
                    .sort(
                        (a, b) =>
                            new Date(a.date).getTime() -
                            new Date(b.date).getTime()
                    );

                const results = await Promise.allSettled(
                    liveGames.map(async (game) => {
                        const params = new URLSearchParams({
                            league: game.league,
                            date: game.date,
                        });

                        const url =
                            `${process.env.NEXT_PUBLIC_API_URL}/api/game/${game.game_id}/score?${params}`;

                        const response = await fetch(url, {
                            cache: "no-store",
                            signal: controller.signal,
                        });

                        if (!response.ok) {
                            throw new Error(
                                `Game ${game.game_id}: HTTP ${response.status}`
                            );
                        }

                        const score: LiveScore = await response.json();

                        console.log("Score response:", {
                            game_id: game.game_id,
                            league: game.league,
                            score,
                        });

                        return {
                            ...score,
                            league: game.league,
                        };
                    })
                );

                if (controller.signal.aborted) return;

                const scores: (LiveScore & { league: string })[] = [];

                results.forEach((result, index) => {
                    if (result.status === "fulfilled") {
                        scores.push(result.value);
                    } else {
                        console.error(
                            `Score request failed for game ${liveGames[index].game_id}:`,
                            result.reason
                        );
                    }
                });

                setGames((currentGames) =>
                    currentGames.map((game) => {
                        const score = scores.find(
                            (item) =>
                                String(item.game_id) === String(game.game_id) &&
                                item.league === game.league
                        );

                        if (!score) return game;

                        return {
                            ...game,
                            home_score: score.home_score ?? game.home_score,
                            away_score: score.away_score ?? game.away_score,
                            actual_slop: score.actual_slop ?? game.actual_slop,
                            actual_watchability: score.actual_watchability ?? game.actual_watchability,
                            watchability_percentile: score.watchability_percentile ?? game.watchability_percentile,
                            slop_percentile: score.slop_percentile ?? game.slop_percentile,
                        };
                    })
                );

            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name !== "AbortError"
                ) {
                    console.error("Failed to update live scores:", error);
                }
            } finally {
                updating = false;
            }
        };

        // Fetch scores immediately after games load
        updateLiveGames();

        // Refresh scores every minute
        const interval = setInterval(
            updateLiveGames,
            60 * 1000
        );

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [games.length, loading]);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const sortedGames = [...games].sort((a, b) => {
        let comparison: number;

        if (sortBy === "live") {
            const currentTime = now;

            const aTime = new Date(a.date).getTime();
            const bTime = new Date(b.date).getTime();

            const aLive = aTime <= currentTime && a.actual_slop == null;
            const bLive = bTime <= currentTime && b.actual_slop == null;

            const aCompleted = a.actual_slop != null;
            const bCompleted = b.actual_slop != null;

            // Desc: Live -> Upcoming -> Completed
            // Asc: Completed -> Upcoming -> Live
            const aGroup = aLive ? 0 : aCompleted ? 2 : 1;
            const bGroup = bLive ? 0 : bCompleted ? 2 : 1;

            if (aGroup !== bGroup) {
                return sortDirection === "desc"
                    ? aGroup - bGroup
                    : bGroup - aGroup;
            }

            // Upcoming and completed - earliest first
            if (aGroup === 1 || aGroup === 2) {
                return aTime - bTime;
            }

            const comparison = aTime - bTime;

            return sortDirection === "desc"
                ? -comparison
                : comparison;
        }

        else if (sortBy === "slop") {
            const aSlop = a.slop_percentile ?? 0;
            const bSlop = b.slop_percentile ?? 0;

            comparison = aSlop - bSlop;
        }

        else if (sortBy === "watchability") {
            const aWatchability = a.watchability_percentile ?? 0;
            const bWatchability = b.watchability_percentile ?? 0;

            comparison = aWatchability - bWatchability;
        }

        else if (sortBy === "watchable-slop") {
            const watchable_slop_split = 0.5;
            const aScore =
                (a.watchability_percentile ?? 0) * watchable_slop_split +
                (a.slop_percentile ?? 0) * (1 - watchable_slop_split);

            const bScore =
                (b.watchability_percentile ?? 0) * watchable_slop_split +
                (b.slop_percentile ?? 0) * (1 - watchable_slop_split);

            comparison = aScore - bScore;
        }

        else if (sortBy === "overall") {
            const aSlop = a.slop_percentile ?? 0;
            const bSlop = b.slop_percentile ?? 0;

            const aWatchability = a.watchability_percentile ?? 0;
            const bWatchability = b.watchability_percentile ?? 0;

            const aOverall = 1 - (aSlop * (1 - aWatchability));
            const bOverall = 1 - (bSlop * (1 - bWatchability));

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

    const currentContent = (
        <>
            {loading ? (
                <GamesSkeleton showLeague={!!sport}/>
            ) : error && games.length === 0 ? (
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

                            return (
                                <FeaturedGameCard
                                    key={game.game_id}
                                    game={game}
                                    now={now}
                                />
                            );
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
        </>
    );

    const swipeContainerRef = useRef<HTMLDivElement>(null);
    const navigateByDate = (direction: "left" | "right") => {
        const width = swipeContainerRef.current?.clientWidth;

        if (!width) return;

        navigate(direction, width + 16);
    };

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
                    <div className="
                            flex 
                            items-center 
                            justify-center
                            gap-3
                            w-full
                            sm:w-fit
                        "
                    >
                        <button
                            type="button"
                            onClick={() => navigateByDate("right")}
                            aria-label="Previous day"
                            className="flex items-center justify-center rounded-lg border border-gray-300 p-2 transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        {/* DATE RANGE */}
                        <DayPickerClient
                            key={`${start ?? "default"}-${end ?? "default"}`}
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

                                params.set("start", formatDate(range.from));
                                params.set("end", formatDate(range.to));

                                router.push(`${gamesBaseUrl}?${params.toString()}`);
                            }}
                        />

                        <button
                            type="button"
                            onClick={() => navigateByDate("left")}
                            aria-label="Next day"
                            className="flex items-center justify-center rounded-lg border border-gray-300 p-2 transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                            <ChevronRight size={20} />
                        </button>
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
                                        | "watchable-slop"
                                        | "overall"
                                        | "live";

                                    setSortBy(value);
                                    setSortDirection(
                                        value === "slop" ||
                                        value === "watchability" ||
                                        value === "watchable-slop" ||
                                        value === "overall"
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
                                <option value="live">Live</option>
                                <option value="date">Date</option>
                                <option value="slop">Slop</option>
                                <option value="watchability">Watchability</option>
                                <option value="watchable-slop">Watchable Slop</option>
                                <option value="overall">Overall</option>

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
            
            <div
                ref={swipeContainerRef}
                className="relative overflow-hidden"
                style={{ touchAction: "pan-y" }}
                {...swipeHandlers}
            >
                {/* Three-panel swipe track */}
                <div
                    data-swipe-track
                    className="grid"
                    style={{
                        width: "calc(300% + 2rem)",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        columnGap: "1rem",
                        transform: `translateX(calc(-33.333333% - 0.333333rem + var(--swipe-offset, ${offset}px)))`,
                        transition: dragging || resetting
                            ? "none"
                            : "transform 250ms ease-out",
                        willChange: "transform",
                    }}
                    onTransitionEnd={(e) => {
                        if (
                            e.target === e.currentTarget &&
                            transitioning
                        ) {
                            finishTransition();
                        }
                    }}
                >
                    <div className="min-w-0 pointer-events-none">
                        <GamesSkeleton showLeague={!!sport} />
                    </div>

                    <div className="min-w-0">
                        {currentContent}
                    </div>

                    <div className="min-w-0 pointer-events-none">
                        <GamesSkeleton showLeague={!!sport} />
                    </div>
                </div>
            </div>

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