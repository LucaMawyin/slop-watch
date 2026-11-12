"use client";

import { Game } from "@/lib/types";
import Link from "next/link";
import Badge from "@/components/Badge";
import ProgressCircle from "@/components/ProgressCircle";
import { getSlopBadge } from "@/lib/getSlopBadge";
import { getHeatColour } from "@/lib/getHeatColour";
import { slugify } from "@/lib/slugify";
import { leagues } from "@/lib/leagues";
import AddToCalendar from "@/components/AddToCalendar";
import { useRouter } from "next/navigation";

interface FeaturedGameCardProps {
    game: Game;
}

export default function FeaturedGameCard({
    game,
}: FeaturedGameCardProps) {
    const router = useRouter();

    const slop = game.slop_percentile;
    const watchability = game.watchability_percentile;

    const slopColour = getHeatColour(slop);
    const watchabilityColour = getHeatColour(1 - watchability);

    const badge = getSlopBadge(slop, watchability);

    const currentLeague = leagues.find(
        (item) => item.id === game.league
    )?.id;

    const leagueName = leagues.find(
        (item) => item.id === game.league
    )?.name;

    const isFinal = game.actual_slop !== null;
    const isLive = !isFinal && new Date(game.date) <= new Date();

    const showScores = isLive || isFinal;

    const gameUrl = `/${game.league}/preview/${game.game_id}?date=${game.date.slice(0, 10)}`;

    return (
        <div
            role="link"
            tabIndex={0}
            onClick={() => router.push(gameUrl)}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    router.push(gameUrl);
                }
            }}
            className="
                flex
                flex-col
                rounded-xl
                border
                border-zinc-800
                bg-zinc-900
                p-5
                transition
                hover:border-zinc-700
                hover:bg-zinc-800/70
                cursor-pointer
            "
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-2">
                <div className="max-w-1/2 text-sm text-zinc-400">
                    {new Date(game.date).toLocaleString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                    })}
                </div>

                <Badge
                    title={badge.title}
                    x={3}
                    y={1}
                    colour={badge.colour}
                />
            </div>

            {/* League */}
            {currentLeague && (
                <div className="mb-3 text-lg font-semibold text-white">
                    <Link
                        href={`/games?league=${currentLeague}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-zinc-300"
                    >
                        {leagueName}
                    </Link>
                </div>
            )}

            {/* Teams */}
            <div className="flex justify-between">
                <div className="max-w-[50%]">
                    <div className="mb-1 text-xs text-zinc-500">
                        HOME
                    </div>

                    <Link
                        href={`/${game.league}/teams/${slugify(game.home_name)}?id=${game.home_id}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xl font-semibold hover:text-zinc-300"
                    >
                        {game.home_name}
                    </Link>
                </div>

                <div className="max-w-[50%] text-right">
                    <div className="mb-1 text-xs text-zinc-500">
                        AWAY
                    </div>

                    <Link
                        href={`/${game.league}/teams/${slugify(game.away_name)}?id=${game.away_id}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xl font-semibold hover:text-zinc-300"
                    >
                        {game.away_name}
                    </Link>
                </div>
            </div>

            {/* Scores */}
            {showScores && (
                <div className="
                    mt-4
                    flex
                    items-center
                    justify-between
                    py-4
                ">
                    <div className="text-3xl font-semibold">
                        {game.home_score ?? "-"}
                    </div>

                    <Badge
                        title={isFinal ? "FINAL" : "LIVE"}
                        x={3}
                        y={1}
                        className="border-none"
                        bgColour={
                            isFinal
                                ? "bg-sky-950"
                                : "bg-green-950"
                        }
                        textColour={
                            isFinal
                                ? "text-sky-400"
                                : "text-green-400"
                        }
                    >
                        {isLive && (
                            <span className="
                                h-1.5
                                w-1.5
                                animate-pulse
                                rounded-full
                                bg-green-400
                            " />
                        )}
                    </Badge>

                    <div className="text-3xl font-semibold">
                        {game.away_score ?? "-"}
                    </div>
                </div>
            )}

            {/* Venue and Statistics */}
            <div className="my-auto">
                <div className="my-3 text-center text-sm text-zinc-500">
                    {game.venue_full_name}
                </div>

                <div className="
                    mb-6
                    flex
                    flex-wrap
                    justify-evenly
                    border-t
                    border-zinc-800
                    pt-4
                    text-center
                ">
                    {/* Slop */}
                    <div>
                        <div className="text-xs text-zinc-500">
                            SLOP SCORE
                        </div>

                        <div className="relative mx-auto mt-3 h-24 w-24">
                            <ProgressCircle
                                progress={slop}
                                progressColour={slopColour}
                            />

                            <div
                                className="
                                    absolute
                                    inset-0
                                    flex
                                    items-center
                                    justify-center
                                    text-xl
                                    font-bold
                                "
                                style={{ color: slopColour }}
                            >
                                {(slop * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    {/* Watchability */}
                    <div>
                        <div className="text-xs text-zinc-500">
                            WATCHABILITY
                        </div>

                        <div className="relative mx-auto mt-3 h-24 w-24">
                            <ProgressCircle
                                progress={watchability}
                                progressColour={watchabilityColour}
                            />

                            <div
                                className="
                                    absolute
                                    inset-0
                                    flex
                                    items-center
                                    justify-center
                                    text-xl
                                    font-bold
                                "
                                style={{ color: watchabilityColour }}
                            >
                                {(watchability * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
                <Link
                    href={gameUrl}
                    onClick={(e) => e.stopPropagation()}
                    className="
                        block
                        w-full
                        rounded-lg
                        bg-zinc-200
                        px-4
                        py-2
                        text-center
                        text-sm
                        font-medium
                        text-zinc-900!
                        transition
                        hover:bg-white
                        no-underline!
                    "
                >
                    View Game
                </Link>

                {game.actual_slop === null &&
                    new Date(game.date) >= new Date() && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <AddToCalendar game={game} />
                        </div>
                    )
                }
            </div>
        </div>
    );
}