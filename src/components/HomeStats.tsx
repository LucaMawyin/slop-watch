"use client";

import { useMemo } from "react";
import type { Game } from "@/lib/types";
import Link from "next/link";
import { getLocalDate } from "@/lib/getLocalDate";
import { leagues } from "@/lib/leagues";

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

        const highestSlop = todaysGames.reduce<Game | null>(
            (best, game) => {
                if (game.slop_percentile == null) return best;

                if (
                    !best ||
                    game.slop_percentile > (best.slop_percentile ?? -1)
                ) {
                    return game;
                }

                return best;
            },
            null
        );

        const highestSlopLeague = leagues.find(
            (item) => item.id === highestSlop?.league
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

        const mostWatchableLeague = leagues.find(
            (item) => item.id === mostWatchable?.league
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
            highestSlop,
            highestSlopLeague,
            mostWatchable,
            mostWatchableLeague,
            liveCount: liveGames.length,
        };
    }, [games]);

    const cards = [
        {
            label: "Games Today",
            value: stats.todayCount,
            description: "Scheduled matchups",
            color: "text-white!",
            href: "/games",
        },
        {
            label: "Highest Slop",
            value: stats.highestSlop
                ? `${(stats.highestSlop.slop_percentile! * 100).toFixed(1)}%`
                : "—",
            description: stats.highestSlop
                ? `${stats.highestSlop.away_name} @ ${stats.highestSlop.home_name} • ${stats.highestSlopLeague?.name}`
                : "No predictions available",
            color: "text-red-400!",
            href: stats.highestSlop
                ? `/${stats.highestSlop.league}/preview/${stats.highestSlop.game_id}?date=${getLocalDate(stats.highestSlop.date)}`
                : undefined,
        },
        {
            label: "Most Watchable",
            value: stats.mostWatchable?.watchability_percentile != null
                ? `${(stats.mostWatchable.watchability_percentile * 100).toFixed(1)}%`
                : "—",
            description: stats.mostWatchable
                ? `${stats.mostWatchable.away_name} @ ${stats.mostWatchable.home_name} • ${stats.mostWatchableLeague?.name}`
                : "No predictions available",
            color: "text-emerald-400!",
            href: stats.mostWatchable
                ? `/${stats.mostWatchable.league}/preview/${stats.mostWatchable.game_id}?date=${getLocalDate(stats.mostWatchable.date)}`
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
                            target="_blank"
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
