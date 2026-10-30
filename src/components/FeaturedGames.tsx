import { Game } from "@/lib/types";
import FeaturedGameCard from "./FeaturedGameCard";
import Link from "next/link";

interface FeaturedGamesProps {
    games: Game[];
}

export default function FeaturedGames({
    games,
}: FeaturedGamesProps) {

    const featuredGames = [...games]
        .filter((game) =>
            game.actual_slop === null &&
            new Date(game.date) <= new Date()
        )
        .sort((a, b) => {
            const aSlop = a.live_slop ?? a.slop_percentile;
            const bSlop = b.live_slop ?? b.slop_percentile;

            return bSlop - aSlop;
        })
        .slice(0, 3);

    return (
        <section className="space-y-5">

            {/* Section heading */}
            <div className="flex items-end justify-between gap-4">


                <h2 className="text-2xl font-bold">
                    Today's Slop
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

            {/* Featured games */}
            {featuredGames.length > 0 ? (
                <div className="
                    grid
                    grid-cols-1
                    gap-4
                    lg:grid-cols-3
                ">
                    {featuredGames.map((game) => (
                        <FeaturedGameCard
                            key={`${game.league}-${game.game_id}`}
                            game={game}
                        />
                    ))}
                </div>
            ) : (
                <div className="
                    rounded-xl
                    border
                    border-zinc-800
                    bg-zinc-900
                    p-8
                    text-center
                ">
                    <p className="font-medium text-zinc-300">
                        No slop detected. Yet.
                    </p>

                    <p className="mt-2 text-sm text-zinc-500">
                        Check back when more games are scheduled.
                    </p>
                </div>
            )}

        </section>
    );
}
