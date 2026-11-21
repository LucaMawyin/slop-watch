"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Game } from "@/lib/types";
import FeaturedGameCard from "./FeaturedGameCard";
import GamesSkeleton from "./GamesSkeleton";

interface UpcomingGamesProps {
    games: Game[];
    now: number;
    category?: string;
    loading?: boolean;
    name?: string;
}

export default function UpcomingGames({
    games,
    now,
    category,
    loading = false,
    name,
}: UpcomingGamesProps) {
    const upcomingGames = useMemo(() => {
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
    }, [games, now]);

    return (
        <section className="space-y-5 w-full">

            <div className="
                flex
                flex-col
                items-start
                gap-4
                sm:flex-row
                sm:items-end
                sm:justify-between
            ">
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
                    Upcoming{name ? ` ${name}` : ""} Games
                </h2>

                <Link
                    href={category ? `/${category}/games` : "/games"}
                    className="
                        shrink-0
                        text-sm
                        font-medium
                        transition
                    "
                >
                    All{name ? ` ${name}` : ""} Games →
                </Link>
            </div>

            {loading ? (
                <GamesSkeleton count={6} />
            ) : upcomingGames.length === 0 ? (
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
                            now={now}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}