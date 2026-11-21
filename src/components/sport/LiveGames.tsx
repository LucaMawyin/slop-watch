
import { Game } from "@/lib/types";
import FeaturedGameCard from "@/components/FeaturedGameCard";
import Link from "next/link";
import GamesSkeleton from "../GamesSkeleton";

interface LiveGamesProps {
    games: Game[];
    now: number;
    name: string;
    category: string;
    loading: boolean;
}

export default function LiveGames({
    games,
    now,
    name,
    category,
    loading,
}: LiveGamesProps) {

    const liveGames = [...games]
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
        <section className="w-full space-y-5">

            <div className="
                flex
                flex-col
                items-start
                gap-4
                sm:flex-row
                sm:items-end
                sm:justify-between
            ">
                <h2 className="text-2xl font-bold">
                    Live {name} Games
                </h2>

                <Link
                    href={`/${category}/games`}
                    className="
                        shrink-0
                        text-sm
                        font-medium
                        transition
                    "
                >
                    All {name} Games →
                </Link>
            </div>

            {loading ? (
                <GamesSkeleton count={3} />
            ) : liveGames.length > 0 ? (
                <div className="
                    grid
                    grid-cols-1
                    gap-4
                    lg:grid-cols-3
                ">
                    {liveGames.map((game) => (
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
                    <p className="font-medium text-white!">
                        No live {name} games.
                    </p>

                    <p className="mt-2 text-sm text-zinc-500">
                        Nothing happening right now. Stay tuned.
                    </p>
                </div>
            )}

        </section>
    );
}
