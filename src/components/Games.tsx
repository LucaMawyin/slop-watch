"use client";

import { Game, LiveScore } from "@/lib/types";
import Link from "next/link";
import {
    Suspense,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
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

    const [previousGames, setPreviousGames] = useState<Game[]>([]);
    const [nextGames, setNextGames] = useState<Game[]>([]);

    const [previousGamesKey, setPreviousGamesKey] = useState<string | null>(null);
    const [nextGamesKey, setNextGamesKey] = useState<string | null>(null);

    const [previousLoading, setPreviousLoading] = useState(true);
    const [nextLoading, setNextLoading] = useState(true);

    const gamesCache = useRef(
        new Map<string, { games: Game[]; version: string }>()
    );

    const makeDateKey = (start: string, end: string) =>
        `${league ?? sport ?? "all"}:${start}:${end}`;

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

    const swipeContainerRef = useRef<HTMLDivElement>(null);
    const previousPanelRef = useRef<HTMLDivElement>(null);
    const currentPanelRef = useRef<HTMLDivElement>(null);
    const nextPanelRef = useRef<HTMLDivElement>(null);

    const panelHeightsRef = useRef({
        previous: 0,
        current: 0,
        next: 0,
    });

    const swipeProgressRef = useRef(0);

    const updateSwipeHeight = useCallback(
        (progress: number, animate = false) => {
            swipeProgressRef.current = progress;

            const heights = {
                previous: previousPanelRef.current?.offsetHeight ?? 0,
                current: currentPanelRef.current?.offsetHeight ?? 0,
                next: nextPanelRef.current?.offsetHeight ?? 0,
            };

            panelHeightsRef.current = heights;

            if (heights.current === 0) return;

            const targetHeight =
                progress > 0
                    ? heights.next
                    : heights.previous;

            const clampedProgress = Math.min(1, Math.abs(progress));

            const height =
                heights.current +
                (targetHeight - heights.current) * clampedProgress;

            const container = swipeContainerRef.current;

            if (!container || height <= 0) return;

            container.style.transition = animate
                ? "height 250ms ease-out"
                : "none";

            container.style.height = `${height}px`;
        },
        []
    );

    const {
        offset,
        dragging,
        direction,
        transitioning,
        transitionKey,
        resetting,
        finishTransition,
        completeTransition,
        navigate,
        ...swipeHandlers
    } = useSwipeNavigation({
        onSwipeLeft: () => router.push(getShiftedDateUrl(1)),
        onSwipeRight: () => router.push(getShiftedDateUrl(-1)),
        onSwipeProgress: updateSwipeHeight,
    });

    const [loadedDateKey, setLoadedDateKey] = useState<string | null>(null);

    const dateKey = makeDateKey(effectiveStart!, effectiveEnd!);

    useEffect(() => {
        navigationDates.current = {
            start: effectiveStart!,
            end: effectiveEnd!,
        };
    }, [dateKey]);

    const previousDateKey = useRef(dateKey);

    useLayoutEffect(() => {
        if (previousDateKey.current !== dateKey) {
            previousDateKey.current = dateKey;
            completeTransition();
        }
    }, [dateKey, completeTransition]);

    useLayoutEffect(() => {
        const panels = [
            previousPanelRef.current,
            currentPanelRef.current,
            nextPanelRef.current,
        ].filter((panel): panel is HTMLDivElement => panel !== null);

        const observer = new ResizeObserver(() => {
            updateSwipeHeight(swipeProgressRef.current);
        });

        panels.forEach((panel) => observer.observe(panel));

        // Set the initial container height.
        updateSwipeHeight(0);

        return () => observer.disconnect();
    }, [updateSwipeHeight]);

    const currentVersion = useRef<{
        key: string;
        version: string;
    } | null>(null);

    const shiftDateRange = (days: number) => {
        const startDate = new Date(`${effectiveStart}T00:00:00`);
        const endDate = new Date(`${effectiveEnd}T00:00:00`);

        startDate.setDate(startDate.getDate() + days);
        endDate.setDate(endDate.getDate() + days);

        return {
            start: formatDate(startDate),
            end: formatDate(endDate),
        };
    };

    const previousRange = shiftDateRange(-1);
    const nextRange = shiftDateRange(1);

    const previousKey = makeDateKey(
        previousRange.start,
        previousRange.end
    );

    const nextKey = makeDateKey(
        nextRange.start,
        nextRange.end
    );

    useEffect(() => {
        const controller = new AbortController();

        const loadAdjacentGames = async () => {
            const previousRange = shiftDateRange(-1);
            const nextRange = shiftDateRange(1);

            const previousKey = makeDateKey(
                previousRange.start,
                previousRange.end
            );

            const nextKey = makeDateKey(
                nextRange.start,
                nextRange.end
            );

            // Immediately display cached games if available
            const cachedPrevious = gamesCache.current.get(previousKey);
            const cachedNext = gamesCache.current.get(nextKey);

            if (cachedPrevious) {
                setPreviousGames(cachedPrevious.games);
                setPreviousGamesKey(previousKey);
                setPreviousLoading(false);
            } else {
                setPreviousGames([]);
                setPreviousGamesKey(null);
                setPreviousLoading(true);
            }

            if (cachedNext) {
                setNextGames(cachedNext.games);
                setNextGamesKey(nextKey);
                setNextLoading(false);
            } else {
                setNextGames([]);
                setNextGamesKey(null);
                setNextLoading(true);
            }

            try {
                const versionResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/version`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!versionResponse.ok) {
                    throw new Error("Failed to get version");
                }

                const { version } = await versionResponse.json() as any;
                const versionString = String(version);

                const fetchRange = async (
                    range: { start: string; end: string },
                    key: string
                ) => {
                    const cached = gamesCache.current.get(key);

                    if (cached?.version === versionString) {
                        return cached.games;
                    }

                    const params = new URLSearchParams();

                    if (sport) {
                        params.set("sport", slugify(sport));
                    } else if (league) {
                        params.set("league", league);
                    }

                    params.set("start", range.start);
                    params.set("end", range.end);
                    params.set("version", versionString);

                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/games?${params}`,
                        {
                            cache: "no-store",
                            signal: controller.signal,
                        }
                    );

                    if (!response.ok) {
                        throw new Error("Failed to fetch adjacent games");
                    }

                    const data: Game[] = await response.json();

                    const filteredGames = data.filter((game) => {
                        const localDate = formatDate(new Date(game.date));

                        return (
                            localDate >= range.start &&
                            localDate <= range.end
                        );
                    });

                    gamesCache.current.set(key, {
                        games: filteredGames,
                        version: versionString,
                    });

                    return filteredGames;
                };

                const [previous, next] = await Promise.all([
                    fetchRange(previousRange, previousKey),
                    fetchRange(nextRange, nextKey),
                ]);

                if (controller.signal.aborted) return;

                setPreviousGames(previous);
                setPreviousGamesKey(previousKey);

                setNextGames(next);
                setNextGamesKey(nextKey);

            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name !== "AbortError"
                ) {
                    console.error("Failed to preload adjacent games:", error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setPreviousLoading(false);
                    setNextLoading(false);
                }
            }
        };

        loadAdjacentGames();

        return () => controller.abort();

    }, [dateKey, league, sport]);


    // Reset filters on reload
    useEffect(() => {
        setSortBy("live");
        setSortDirection("desc");
    }, [sport, league]);

    useEffect(() => {
        const controller = new AbortController();

        let initialLoad = true;

        const cached = gamesCache.current.get(dateKey);

        if (cached) {
            setGames(cached.games);
            setLoading(false);
            setLoadedDateKey(dateKey);

            currentVersion.current = {
                key: dateKey,
                version: cached.version,
            };
        } else {
            setLoading(true);
        }

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

                gamesCache.current.set(dateKey, {
                    games: filteredGames,
                    version: newVersion,
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
    }, [dateKey, games.length, loading]);

    useEffect(() => {
        if (loading || loadedDateKey !== dateKey) return;

        const cached = gamesCache.current.get(dateKey);

        if (!cached) return;

        gamesCache.current.set(dateKey, {
            ...cached,
            games,
        });
    }, [games, dateKey, loadedDateKey, loading]);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const sortGames = (items: Game[]) => {
        return [...items].sort((a, b) => {
            let comparison: number;

            if (sortBy === "live") {
                const aTime = new Date(a.date).getTime();
                const bTime = new Date(b.date).getTime();

                const aLive = aTime <= now && a.actual_slop == null;
                const bLive = bTime <= now && b.actual_slop == null;

                const aCompleted = a.actual_slop != null;
                const bCompleted = b.actual_slop != null;

                const aGroup = aLive ? 0 : aCompleted ? 2 : 1;
                const bGroup = bLive ? 0 : bCompleted ? 2 : 1;

                if (aGroup !== bGroup) {
                    return sortDirection === "desc"
                        ? aGroup - bGroup
                        : bGroup - aGroup;
                }

                if (aGroup === 1 || aGroup === 2) {
                    return aTime - bTime;
                }

                comparison = aTime - bTime;

                return sortDirection === "desc"
                    ? -comparison
                    : comparison;
            }

            else if (sortBy === "slop") {
                comparison =
                    (a.slop_percentile ?? 0) -
                    (b.slop_percentile ?? 0);
            }

            else if (sortBy === "watchability") {
                comparison =
                    (a.watchability_percentile ?? 0) -
                    (b.watchability_percentile ?? 0);
            }

            else if (sortBy === "watchable-slop") {
                const split = 0.5;

                const aScore =
                    (a.watchability_percentile ?? 0) * split +
                    (a.slop_percentile ?? 0) * (1 - split);

                const bScore =
                    (b.watchability_percentile ?? 0) * split +
                    (b.slop_percentile ?? 0) * (1 - split);

                comparison = aScore - bScore;
            }

            else if (sortBy === "overall") {
                const aOverall =
                    1 - ((a.slop_percentile ?? 0) *
                    (1 - (a.watchability_percentile ?? 0)));

                const bOverall =
                    1 - ((b.slop_percentile ?? 0) *
                    (1 - (b.watchability_percentile ?? 0)));

                comparison = aOverall - bOverall;
            }

            else {
                comparison =
                    new Date(a.date).getTime() -
                    new Date(b.date).getTime();
            }

            return sortDirection === "asc"
                ? comparison
                : -comparison;
        });
    };

    const cachedCurrent = gamesCache.current.get(dateKey);

    const displayGames =
        loadedDateKey === dateKey
            ? games
            : cachedCurrent?.games ?? [];

    const displayLoading =
        loadedDateKey !== dateKey &&
        !cachedCurrent;

    const sortedGames = sortGames(displayGames);

    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = loadMoreRef.current;

        if (!sentinel || visibleCount >= sortedGames.length) return;

        let timeout: NodeJS.Timeout;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    observer.unobserve(sentinel);

                    timeout = setTimeout(() => {
                        setVisibleCount((count) =>
                            Math.min(count + 9, sortedGames.length)
                        );
                    }, 150);
                }
            },
            {
                root: null,
                rootMargin: "0px",
                threshold: 0,
            }
        );

        observer.observe(sentinel);

        return () => {
            observer.disconnect();
            clearTimeout(timeout);
        };
    }, [visibleCount, sortedGames.length]);

    const currentContent = (
        <>
            {displayLoading ? (
                <GamesSkeleton showLeague={!!sport}/>
            ) : error && displayGames.length === 0 ? (
                <p className="mt-4 text-red-400!">{error}</p>
            ) : displayGames.length === 0 ? (
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
                        {sortedGames.slice(0, visibleCount).map((game, index) => {

                            return (
                                <FeaturedGameCard
                                    key={game.game_id}
                                    game={game}
                                    now={now}
                                    className="game-fade-up"
                                    style={{
                                        animationDelay: `${(index % 9) * 50}ms`,
                                    }}
                                />
                            );
                        })}
                    </div>
                    {visibleCount < sortedGames.length && (
                        <div
                            ref={loadMoreRef}
                            className="h-10"
                            aria-hidden="true"
                        />
                    )}
                </>
            )}
        </>
    );

    const navigateByDate = (direction: "left" | "right") => {
        const width = swipeContainerRef.current?.clientWidth;

        if (!width) return;

        navigate(direction, width + 16);
    };

    const renderGames = (items: Game[]) => {
        const sorted = sortGames(items);

        if (sorted.length === 0) {
            return (
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
            );
        }

        return (
            <div className="
                mt-8
                grid
                auto-rows-fr
                grid-cols-1
                gap-4
                sm:grid-cols-2
                lg:grid-cols-3
            ">
                {sorted.slice(0, visibleCount).map((game, index) => (
                    <FeaturedGameCard
                        key={`${game.league}-${game.game_id}`}
                        game={game}
                        now={now}
                        className="game-fade-up"
                        style={{
                            animationDelay: `${(index % 9) * 50}ms`,
                        }}
                    />
                ))}
            </div>
        );
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
                className="relative"
                style={{ touchAction: "pan-y" }}
                {...swipeHandlers}
            >
                <div
                    className="relative overflow-hidden"
                    style={{ height: "100%" }}
                >
                    <div
                        data-swipe-track
                        className="absolute inset-0"
                        style={{
                            width: "calc(300% + 2rem)",
                            transform: `translate3d(calc(-33.333333% - 0.333333rem + var(--swipe-offset, ${offset}px)), 0, 0)`,
                            transition: dragging || resetting
                                ? "none"
                                : "transform 250ms ease-out",
                            willChange: "transform",
                        }}
                        onTransitionEnd={(e) => {
                            if (
                                e.target === e.currentTarget &&
                                e.propertyName === "transform" &&
                                transitioning
                            ) {
                                finishTransition();
                            }
                        }}
                    >
                        {/* Previous date */}
                        <div
                            ref={previousPanelRef}
                            className="absolute left-0 top-0 min-w-0 pointer-events-none flow-root"
                            style={{
                                width: "calc((100% - 2rem) / 3)",
                            }}
                        >
                            {previousGamesKey !== previousKey || previousLoading
                                ? gamesCache.current.has(previousKey)
                                    ? renderGames(gamesCache.current.get(previousKey)!.games)
                                    : <GamesSkeleton showLeague={!!sport} />
                                : renderGames(previousGames)}
                        </div>

                        {/* Current date */}
                        <div
                            ref={currentPanelRef}
                            className="absolute top-0 min-w-0 flow-root"
                            style={{
                                left: "calc((100% - 2rem) / 3 + 1rem)",
                                width: "calc((100% - 2rem) / 3)",
                            }}
                        >
                            {currentContent}
                        </div>

                        {/* Next date */}
                        <div
                            ref={nextPanelRef}
                            className="absolute top-0 min-w-0 pointer-events-none flow-root"
                            style={{
                                left: "calc(2 * ((100% - 2rem) / 3 + 1rem))",
                                width: "calc((100% - 2rem) / 3)",
                            }}
                        >
                            {nextGamesKey !== nextKey || nextLoading
                                ? gamesCache.current.has(nextKey)
                                    ? renderGames(gamesCache.current.get(nextKey)!.games)
                                    : <GamesSkeleton showLeague={!!sport} />
                                : renderGames(nextGames)}
                        </div>
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