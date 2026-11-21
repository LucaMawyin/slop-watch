import { Game } from "@/lib/types";
import FeaturedGameCard from "./FeaturedGameCard";
import Link from "next/link";

interface FeaturedGamesProps {
    games: Game[];
    now: number;
}

export default function FeaturedGames({
    games,
    now,
}: FeaturedGamesProps) {

    const featuredGames = [...games]
        .filter((game) =>
            game.actual_slop === null &&
            new Date(game.date).getTime() <= now
        )
        .sort((a, b) => {
            const aSlop = a.live_slop ?? a.slop_percentile ?? 0;
            const bSlop = b.live_slop ?? b.slop_percentile ?? 0;

            return bSlop - aSlop;
        })
        .slice(0, 3);

    return (
        <section className="space-y-5">

            {/* Section heading */}
            <div className="flex items-end justify-between gap-4">


                <h2 className="text-2xl font-bold">
                    Live Slop
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
                    All Games →
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
                            now={now}
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
                        No live slop detected.
                    </p>

                    <p className="mt-2 text-sm text-zinc-500">
                        Nothing happening right now. Stay tuned.
                    </p>
                </div>
            )}

        </section>
    );
}
