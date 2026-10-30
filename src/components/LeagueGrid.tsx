"use client";

import Link from "next/link";
import { leagues } from "@/lib/leagues";

const sportOrder = [
    "Basketball",
    "Football",
    "Baseball",
    "Hockey",
    "Soccer",
];

export default function LeagueGrid() {
    const groupedLeagues = sportOrder.map((sport) => ({
        sport,
        leagues: leagues.filter((league) => league.sport === sport),
    }));

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Browse Leagues
                </h2>

                <span className="text-sm text-zinc-500">
                    {leagues.length} leagues available
                </span>
            </div>

            <div className="space-y-7">
                {groupedLeagues.map(({ sport, leagues: sportLeagues }) => {
                    if (sportLeagues.length === 0) return null;

                    return (
                        <div key={sport} className="space-y-3">
                            <div className="flex items-center gap-2">

                                <Link 
                                    className="text-sm font-semibold text-zinc-300"
                                    href={`/games?sport=${encodeURIComponent(sport).toLowerCase()}`}
                                >
                                    {sport}
                                </Link>

                                <div className="h-px flex-1 bg-zinc-800" />
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {sportLeagues.map((league) => (
                                    <Link
                                        key={league.id}
                                        href={`/games?league=${encodeURIComponent(league.id)}`}
                                        className="
                                            group
                                            flex
                                            min-h-24
                                            items-center
                                            justify-between
                                            gap-3
                                            rounded-xl
                                            border
                                            border-zinc-800
                                            bg-zinc-900/50
                                            p-4
                                            transition-all
                                            duration-200
                                            no-underline!
                                            hover:border-emerald-500/40
                                            hover:bg-zinc-900
                                            focus-visible:outline-none
                                            focus-visible:ring-2
                                            focus-visible:ring-emerald-400
                                        "
                                    >
                                        <div className="min-w-0 space-y-1">
                                            <h4 className="font-semibold text-white transition-colors group-hover:text-emerald-400">
                                                {league.name}
                                            </h4>

                                            <p className="text-xs text-zinc-500">
                                                {league.sport}
                                            </p>
                                        </div>

                                        <span
                                            aria-hidden="true"
                                            className="
                                                shrink-0
                                                text-lg
                                                text-zinc-600
                                                transition-all
                                                group-hover:translate-x-0.5
                                                group-hover:text-emerald-400
                                            "
                                        >
                                            →
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}