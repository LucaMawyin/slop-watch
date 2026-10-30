"use client";

import { useMemo } from "react";
import type { Game } from "@/lib/types";
import Link from "next/link";

interface HomeStatsProps {
    games: Game[];
}

export default function HomeStats({ games }: HomeStatsProps) {
    const stats = useMemo(() => {

        const today = (() => {
            const date = new Date();

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");

            return `${year}-${month}-${day}`;
        })();

        const todaysGames = games.filter(
            (game) => {
                const date = new Date(game.date);

                const localDate = [
                    date.getFullYear(),
                    String(date.getMonth() + 1).padStart(2, "0"),
                    String(date.getDate()).padStart(2, "0"),
                ].join("-");

                return localDate === today;
            }
        );

        const highSlopGames = todaysGames.filter(
            (game) => (game.slop_percentile ?? 0) >= 90
        );

        const mostWatchable = todaysGames.reduce<Game | null>(
            (best, game) => {
                if (game.watchability_percentile == null) return best;

                if (
                    !best ||
                    (game.watchability_percentile ?? -1) >
                        (best.watchability_percentile ?? -1)
                ) {
                    return game;
                }

                return best;
            },
            null
        );

        const liveGames = todaysGames.filter((game) => {
            const date = new Date(game.date).getTime();
            const now = Date.now();

            return (
                date <= now &&
                game.home_score != null &&
                game.away_score != null &&
                game.actual_slop == null
            );
        });

        return {
            todayCount: todaysGames.length,
            highSlopCount: highSlopGames.length,
            mostWatchable,
            liveCount: liveGames.length,
        };
    }, [games]);

    const cards = [
        {
            label: "Games Today",
            value: stats.todayCount,
            description: "Scheduled matchups",
            color: "text-white!",
        },
        {
            label: "High Slop",
            value: stats.highSlopCount,
            description: "90th percentile or higher",
            color: "text-red-400!",
        },
        {
            label: "Most Watchable",
            value: stats.mostWatchable
                ? `${Math.round(stats.mostWatchable.watchability_percentile * 100)}%`
                : "—",
            description: stats.mostWatchable
                ? `${stats.mostWatchable.away_name} @ ${stats.mostWatchable.home_name}`
                : "No predictions available",
            color: "text-emerald-400!",
            href: stats.mostWatchable
                ? `/${stats.mostWatchable.league}/preview/${stats.mostWatchable.game_id}?date=${stats.mostWatchable.date.slice(0, 10)}`
                : undefined,
        },
        {
            label: "Live Games",
            value: stats.liveCount,
            description: "Currently in progress",
            color: "text-sky-400!",
            href: "/games",
        },
    ];

    return (
        <section className="space-y-4">

            <h2 className="
                mt-1 
                text-2xl 
                font-bold 
                tracking-tight 
                text-white
                sm:text-3xl
            ">
                Today&apos;s Slop Report
            </h2>


            <div className="
                grid 
                grid-cols-2 
                gap-3 
                xl:grid-cols-4
            ">
                {cards.map((card) => {
                    const content = (
                        <>
                            <p className="text-sm text-zinc-400">
                                {card.label}
                            </p>

                            <p className={`
                                mt-3
                                truncate
                                text-3xl
                                font-bold
                                tracking-tight
                                sm:text-4xl
                                ${card.color}
                            `}>
                                {card.value}
                            </p>

                            <p className="mt-2 truncate text-xs text-zinc-500">
                                {card.description}
                            </p>
                        </>
                    );

                    const className = `
                        min-w-0
                        rounded-2xl
                        border
                        border-zinc-800
                        bg-zinc-900/70
                        p-4
                        text-left
                        sm:p-5
                        ${card.href ? `
                            transition 
                            no-underline!
                            hover:border-zinc-600 
                            hover:bg-zinc-800/70 
                            cursor-pointer
                        ` : ""}
                    `;

                    return card.href ? (
                        <Link
                            key={card.label}
                            href={card.href}
                            className={className}
                        >
                            {content}
                        </Link>
                    ) : (
                        <div key={card.label} className={className}>
                            {content}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
