"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/types";
import HomeStats from "@/components/HomeStats";
import FeaturedGames from "@/components/FeaturedGames";
import LeagueGrid from "@/components/LeagueGrid";
import UpcomingGames from "@/components/UpcomingGames";
import { useNotifications } from "@/components/NotificationProvider";
import HomeSkeleton from "@/components/HomeSkeleton";

export default function Home() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { notify, dismiss, dismissAll } = useNotifications();

    const gamesRef = useRef<Game[]>([]);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        gamesRef.current = games;
    }, [games]);

    useEffect(() => {
        return () => {
            dismissAll();
        };
    }, [dismissAll]);

    useEffect(() => {
        const controller = new AbortController();

        let currentVersion: string | null = null;
        let initialLoad = true;

        const loadGames = async (checkVersion = true) => {
            try {
                let version: string | null = null;

                // Only check the version during background updates
                if (checkVersion) {
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

                    const result = await versionResponse.json() as any;
                    version = String(result.version);

                    if (currentVersion === version) return;
                }

                const today = new Date();
                const end = new Date(today);

                end.setDate(today.getDate() + 1);

                const formatDate = (date: Date) =>
                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

                const params = new URLSearchParams({
                    start: formatDate(today),
                    end: formatDate(end),
                });

                // Fetch games directly using the backend's active dataset version
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/games?${params}`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to load games.");
                }

                const data: Game[] = await response.json();

                if (controller.signal.aborted) return;

                console.log("Homepage games fetched:", {
                    version: version ?? "active",
                    count: data.length,
                });

                if (version !== null) {
                    currentVersion = version;
                }

                setGames(data);
                setError(null);

                // Keep your existing initial live-score fetching code here,
                // unchanged.

            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }

                console.error("Failed to load games:", err);

                if (initialLoad) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Something went wrong."
                    );
                }
            } finally {
                if (initialLoad && !controller.signal.aborted) {
                    initialLoad = false;
                    setLoading(false);
                }
            }
        };

        // Load games immediately without waiting for a version check
        loadGames(false);

        // Check for new games every five minutes
        const interval = setInterval(
            () => loadGames(true),
            5 * 60 * 1000
        );

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (loading || games.length === 0) return;

        const controller = new AbortController();

        let updating = false;

        const updateLiveGames = async () => {
            if (updating) return;

            updating = true;

            try {
                const now = Date.now();

                // Only check live, completed, or starting games
                const liveGames = gamesRef.current
                    .filter((game) => {
                        const age = now - new Date(game.date).getTime();

                        return (
                            age >= -30 * 60 * 1000 &&
                            age <= 6 * 60 * 60 * 1000
                        );
                    })
                    .sort(
                        (a, b) =>
                            (b.slop_percentile ?? 0) -
                            (a.slop_percentile ?? 0)
                    )
                    .slice(0, 3);

                const results = await Promise.allSettled(
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
                            throw new Error(`Failed to fetch score for ${game.game_id}`);
                        }

                        const updatedGame: Partial<Game> = await response.json();

                        return {
                            game,
                            updatedGame,
                        };
                    })
                );

                if (controller.signal.aborted) return;

                setGames((current) =>
                    current.map((game) => {
                        const result = results.find(
                            (item) =>
                                item.status === "fulfilled" &&
                                item.value.game.game_id === game.game_id &&
                                item.value.game.league === game.league
                        );

                        return result?.status === "fulfilled"
                            ? {
                                ...game,
                                ...Object.fromEntries(
                                    Object.entries(result.value.updatedGame).map(([key, value]) => [
                                        key,
                                        value ?? game[key as keyof Game],
                                    ])
                                ),
                            }
                            : game;
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

        // Fetch scores immediately then every minute
        updateLiveGames();

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

    return (
        <div className="
            mx-auto
            w-full
            max-w-7xl
            space-y-10
            p-6
            text-white
        ">
            <section className="
                flex
                flex-col
                gap-2
                border-b
                border-zinc-800
                pb-8
            ">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    Slop Watch
                </h1>

                <p className="max-w-xl text-zinc-400">
                    Some games are worth watching.
                    Some games are pure slop.
                    Find out which is which.
                </p>
            </section>

            {error && games.length === 0 ? (
                <p className="text-red-400">{error}</p>
            ) : loading ? (
                <HomeSkeleton />
            ) : (
                <>
                    <HomeStats games={games} now={now} />
                    <FeaturedGames games={games} now={now} />
                    <UpcomingGames games={games} now={now} />
                    <LeagueGrid />
                </>
            )}
        </div>
    );
}