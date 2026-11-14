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

        const loadGames = async () => {
            try {
                // Check which hourly dataset is currently published
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

                // Nothing changed so dont download the games again
                if (currentVersion === String(version)) return;

                const today = new Date();
                const end = new Date(today);

                end.setDate(today.getDate() + 7);

                const formatDate = (date: Date) =>
                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

                const params = new URLSearchParams({
                    start: formatDate(today),
                    end: formatDate(end),
                    version: String(version),
                });

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/games?${params}`,
                    {
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to load games.");
                }

                const data: Game[] = await response.json();

                if (controller.signal.aborted) return;

                // Only mark version as loaded after successful response
                currentVersion = String(version);

                setGames(data);
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

        // Load the initial games
        loadGames();

        // Check for new games every five minutes
        const interval = setInterval(loadGames, 5 * 60 * 1000);

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (games.length === 0) return;

        const controller = new AbortController();

        let updating = false;

        const updateLiveGames = async () => {
            if (updating) return;

            updating = true;

            try {
                const now = Date.now();

                // Only check live, completed, or starting games
                const liveGames = gamesRef.current.filter((game) => {
                    const age = now - new Date(game.date).getTime();

                    return (
                        age >= -30 * 60 * 1000 &&
                        age <= 6 * 60 * 60 * 1000
                    );
                });

                await Promise.all(
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

                        if (!response.ok) return;

                        const updatedGame: Partial<Game> =
                            await response.json();

                        if (controller.signal.aborted) return;

                        setGames((current) =>
                            current.map((item) =>
                                item.game_id === game.game_id &&
                                item.league === game.league
                                    ? { ...item, ...updatedGame }
                                    : item
                            )
                        );
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
    }, [games.length]);

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
                    <HomeStats games={games} />
                    <FeaturedGames games={games} />
                    <UpcomingGames games={games} />
                    <LeagueGrid />
                </>
            )}
        </div>
    );
}