"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Game } from "@/lib/types";
import FeaturedGameCard from "./FeaturedGameCard";

interface UpcomingGamesProps {
    games: Game[];
}

export default function UpcomingGames({ games }: UpcomingGamesProps) {
    const upcomingGames = useMemo(() => {
        const now = Date.now();

        return games
            .filter((game) => {
                const date = new Date(game.date).getTime();
                return Number.isFinite(date) && date > now;
            })
            .sort(
                (a, b) =>
                    new Date(a.date).getTime() -
                    new Date(b.date).getTime()
            )
            .slice(0, 6);
    }, [games]);

    return (
        <section className="space-y-5">
            <div className="flex items-end justify-between gap-4">
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
                    Upcoming Games
                </h2>

                <Link
                    href="/games"
                    className="
                        shrink-0
                        text-sm
                        font-medium
                        transition
                    "
                >
                    All games →
                </Link>
            </div>

            {upcomingGames.length === 0 ? (
                <div className="
                    rounded-xl
                    border
                    border-zinc-800
                    bg-zinc-900
                    p-8
                    text-center
                ">
                    <p className="font-medium text-zinc-300">
                        No upcoming games found
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                        Check back when more games are scheduled.
                    </p>
                </div>
            ) : (
                <div className="
                    grid
                    grid-cols-1
                    gap-4
                    md:grid-cols-2
                    lg:grid-cols-3
                ">
                    {upcomingGames.map((game) => (
                        <FeaturedGameCard
                            key={`${game.league}-${game.game_id}`}
                            game={game}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}