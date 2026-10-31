"use client";

import { useEffect, useState } from "react";
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

    const { notify, dismiss } = useNotifications();

    useEffect(() => {
        const controller = new AbortController();
        let notificationTimeout: ReturnType<typeof setTimeout> | undefined;

        const loadGames = async () => {
            try {
                setError(null);

                const today = new Date();
                const end = new Date();

                end.setDate(today.getDate() + 7);

                const formatDate = (date: Date) =>
                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

                const params = new URLSearchParams({
                    start: formatDate(today),
                    end: formatDate(end),
                });

                // Load the schedule first
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/games?${params}`,
                    { 
                        signal: controller.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error("Failed to load games.");
                }

                const data: Game[] = await response.json();

                if (controller.signal.aborted) return;

                setGames(data);
                setLoading(false);

                // Load scores in the background
                const now = new Date();

                const gamesToUpdate = data.filter((game) => {
                    const gameDate = new Date(game.date);

                    const startOfWindow = new Date(now.getTime() - 60 * 60 * 1000);

                    const endOfDay = new Date(now);
                    endOfDay.setHours(23, 59, 59, 999);

                    return (
                        gameDate >= startOfWindow &&
                        gameDate <= endOfDay
                    );
                });

                if (gamesToUpdate.length === 0) return;

                const notificationId = notify(
                    `Updating scores for ${gamesToUpdate.length} games...`,
                    "info",
                    null
                );

                notificationTimeout = setTimeout(() => {
                    dismiss(notificationId);
                }, 60 * 1000);

                const results = await Promise.allSettled(
                    gamesToUpdate.map(async (game) => {
                        const scoreResponse = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/game/${game.game_id}/score?league=${game.league}&date=${encodeURIComponent(game.date)}`,
                            { signal: controller.signal }
                        );

                        if (!scoreResponse.ok) {
                            throw new Error("Failed to update game.");
                        }

                        const updatedGame: Partial<Game> =
                            await scoreResponse.json();

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

                clearTimeout(notificationTimeout);

                if (controller.signal.aborted) return;

                dismiss(notificationId);

                const successful = results.filter(
                    (result) => result.status === "fulfilled"
                ).length;

                const failed = results.length - successful;

                if (failed === 0) {
                    notify(`Successfully updated ${successful} games.`, "success");
                } else if (successful === 0) {
                    notify("Failed to update game scores.", "error");
                } else {
                    notify(
                        `Updated ${successful} games. ${failed} failed.`,
                        "warning"
                    );
                }
                
            } catch (err) {
                if (
                    err instanceof Error &&
                    err.name === "AbortError"
                ) {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : "Something went wrong."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadGames();

        return () => {
            controller.abort();
            clearTimeout(notificationTimeout);
        };
    }, [notify]);

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