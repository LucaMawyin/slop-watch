"use client";

import Badge from "@/components/Badge";
import PreviewSkeleton from "@/components/PreviewSkeleton";
import { getHeatColour } from "@/lib/getHeatColour";
import { getSlopBadge } from "@/lib/getSlopBadge";
import { slugify } from "@/lib/slugify";
import { Game, Team } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

type Props = {
    params: Promise<{
        league: string;
        id: string;
    }>;
};

export default function PreviewPage({ params }: Props) {

    const { league, id } = use(params);
    const searchParams = useSearchParams();
    const date = searchParams.get("date");
    const ref = searchParams.get("ref");

    const [start, end] = ref?.split("_") ?? [];

    const [game, setGame] = useState<Game | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                setLoading(true);
                setError(null);

                if (!date) {
                    throw new Error("Missing game date");
                }

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/game/${id}?league=${league}&date=${encodeURIComponent(date)}`,
                    {
                        cache: "no-store",
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Games API failed: ${response.status}`
                    );
                }

                const gameData = await response.json() as Game;

                setGame(gameData);
                setLoading(false);

            } catch (error) {
                console.error(error);

                setError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load game preview"
                );

                setLoading(false);
            }
        };

        // Run after the initial render.
        const timeout = setTimeout(fetchPreview, 0);

        return () => {
            clearTimeout(timeout);
        };
    }, [id, league, date]);

    const gameRef = useRef<Game | null>(null);

    useEffect(() => {
        gameRef.current = game;
    }, [game]);

    useEffect(() => {
        const updateScore = async () => {
            const currentGame = gameRef.current;

            if (!currentGame) {
                return;
            }

            const gameDate = new Date(currentGame.date);
            const now = new Date();

            const age = now.getTime() - gameDate.getTime();

            // Dont query games until 30 minutes after start
            if (age < 30 * 60 * 1000) {
                return;
            }

            // Dont query completed games
            if (currentGame.actual_slop !== null) {
                return;
            }

            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/game/${id}/score?league=${league}&date=${encodeURIComponent(currentGame.date)}`,
                    {
                        cache: "no-store",
                    }
                );

                if (!response.ok) {
                    console.error(
                        `Score request failed: ${response.status}`
                    );
                    return;
                }

                const score = await response.json() as {
                    home_score: number | null;
                    away_score: number | null;
                };

                setGame((currentGame) => {
                    if (!currentGame) {
                        return currentGame;
                    }

                    return {
                        ...currentGame,
                        home_score: score.home_score,
                        away_score: score.away_score,
                    };
                });
            } catch (error) {
                console.error(
                    `Failed to fetch score for ${id}:`,
                    error
                );
            }
        };

        // Wait until initial render has completed.
        const timeout = setTimeout(updateScore, 0);

        // Query every 2 minutes
        const interval = setInterval(
            updateScore,
            2 * 60 * 1000
        );

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [id, league]);

    if (loading) {
        return (
            <main className="p-6 text-white">

                <div className="mx-auto max-w-5xl">
                    {/* BACK */}
                    <Link
                        href={`/games?league=${league}${start ? `&start=${start}` : ""}${end ? `&end=${end}` : ""}`}
                        className="mb-4 block hover:underline w-fit"
                    >
                        &lt; Back to {league.toUpperCase()} Games
                    </Link>
                    <PreviewSkeleton />
                </div>
            </main>
        );
    }

    if (error || !game) {
        return (
            <main className="p-6 text-white">
                <div className="mx-auto max-w-5xl">
                    <p className="text-red-400">
                        {error ?? "Failed to load game preview."}
                    </p>

                    <Link
                        href={`/games?league=${league}${start ? `&start=${start}` : ""}${end ? `&end=${end}` : ""}`}
                        className="mt-4 inline-block hover:underline"
                    >
                        &lt; Back to {league.toUpperCase()} Games
                    </Link>
                </div>
            </main>
        );
    }

    const isLive =
        game.actual_slop === null &&
        new Date(game.date) <= new Date();

    const slop =
        isLive &&
        typeof game.live_slop === "number" &&
        Number.isFinite(game.live_slop)
            ? game.live_slop
            : typeof game.slop_percentile === "number" &&
                Number.isFinite(game.slop_percentile)
                ? game.slop_percentile
                : 0;

    const watchability =
        isLive &&
        typeof game.live_watchability === "number" &&
        Number.isFinite(game.live_watchability)
            ? game.live_watchability
            : typeof game.watchability_percentile === "number" &&
                Number.isFinite(game.watchability_percentile)
                ? game.watchability_percentile
                : 0;

    const slopColour = getHeatColour(slop);
    const watchabilityColour = getHeatColour(1 - watchability);

    const badge = getSlopBadge(slop, watchability);

    return (
        <main className="w-full p-6 text-white">
            <div className="mx-auto max-w-5xl">

                {/* BACK */}
                <Link
                    href={`/games?league=${league}${start ? `&start=${start}` : ""}${end ? `&end=${end}` : ""}`}
                    className="mb-4 block hover:underline w-fit"
                >
                    &lt; Back to {league.toUpperCase()} Games
                </Link>

                {/* HEADER */}
                <div className="text-center">
                    <div className="uppercase text-zinc-500">
                        {league}
                    </div>

                    <div className="mt-2 text-sm text-zinc-400">
                        {new Date(game.date).toLocaleString([], {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                        })}
                    </div>

                    <div className="
                        mx-auto 
                        mt-6 
                        flex 
                        w-full 
                        max-w-3xl 
                        items-center 
                        justify-between 
                        gap-4 
                        sm:gap-8
                    ">

                        {/* HOME */}
                        <div className="w-0 flex-1 text-center">
                            <div className="text-zinc-500">
                                HOME
                            </div>
                            <Link
                                href={`/${league}/teams/${slugify(game.home_name)}`}
                                target="_blank"
                                className="
                                    flex
                                    w-full
                                    justify-center
                                    wrap-break-words 
                                    text-[clamp(1.25rem,4vw,2.25rem)]
                                    font-bold 
                                    hover:underline 
                                "
                            >
                                {game.home_full_name}
                            </Link>
                        </div>

                        {/* SCORE / VS */}
                        <div className="shrink-0 text-center text-lg font-semibold text-zinc-500">
                            {(
                                game.actual_slop !== null ||
                                (
                                    new Date(game.date) <= new Date() &&
                                    game.home_score !== null &&
                                    game.away_score !== null
                                )
                            ) ? (
                                <div>
                                    {game.actual_slop === null && (
                                        <div className="mb-1 text-xs font-semibold text-green-400">
                                            ● LIVE
                                        </div>
                                    )}

                                    <div className="text-4xl font-bold text-white">
                                        {game.home_score} - {game.away_score}
                                    </div>
                                </div>
                            ) : (
                                "VS"
                            )}
                        </div>

                        {/* AWAY */}
                        <div className="w-0 flex-1 text-center">
                            <div className="text-zinc-500">
                                AWAY
                            </div>
                            <Link
                                href={`/${league}/teams/${slugify(game.away_name)}`}
                                target="_blank"
                                className="
                                    flex
                                    w-full
                                    justify-center
                                    wrap-break-words 
                                    text-[clamp(1.25rem,4vw,2.25rem)] 
                                    font-bold 
                                    hover:underline 
                                "
                            >
                                {game.away_full_name}
                            </Link>
                        </div>

                    </div>

                    <div className="mt-4 text-sm text-zinc-500">
                        {game.venue_full_name}
                    </div>

                    <div className="mt-5">
                        <Badge
                            title={badge.title}
                            x={3}
                            y={1}
                            colour={badge.colour}
                        />
                    </div>
                </div>

                {/* PREDICTION */}
                <section className="mt-8">
                    <h2 className="mb-4 text-xl font-semibold">
                        Game {game.actual_slop === null ? "Prediction" : "Result"}
                    </h2>

                    <div className="grid grid-cols-2 gap-4">

                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
                            <div className="text-xs text-zinc-500">
                                SLOP
                            </div>

                            <div
                                className="mt-2 text-3xl font-bold"
                                style={{ color: slopColour }}
                            >
                                {(slop * 100).toFixed(1)}%
                            </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
                            <div className="text-xs text-zinc-500">
                                WATCHABILITY
                            </div>

                            <div
                                className="mt-2 text-3xl font-bold"
                                style={{ color: watchabilityColour }}
                            >
                                {(watchability * 100).toFixed(1)}%
                            </div>
                        </div>

                    </div>
                </section>

                {/* TEAM COMPARISON */}
                <section className="mt-8">
                    <h2 className="mb-4 text-xl font-semibold">
                        Pre-Game Comparison
                    </h2>

                    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">

                        {/* HEADER */}
                        <div className="grid grid-cols-3 border-b border-zinc-800 p-5 text-center">
                            <div className="text-left font-semibold">
                                {game.home_full_name}
                            </div>

                            <div className="my-auto text-xs text-zinc-500">
                                TEAM
                            </div>

                            <div className="text-right font-semibold">
                                {game.away_full_name}
                            </div>
                        </div>

                        {/* RECORD */}
                        <div className="grid grid-cols-3 items-center border-b border-zinc-800 p-5">
                            <div className="text-left font-semibold">
                                {game.home_season_wins ?? 0 } - {game.home_season_losses ?? 0}
                            </div>

                            <div className="text-center text-xs text-zinc-500">
                                RECORD
                            </div>

                            <div className="text-right font-semibold">
                                {game.away_season_wins ?? 0} - {game.away_season_losses ?? 0}
                            </div>
                        </div>

                        {/* WIN % */}
                        <div className="grid grid-cols-3 items-center border-b border-zinc-800 p-5">
                            <div className="text-left font-semibold">
                                {(game.home_season_win_pct * 100).toFixed(1)}%
                            </div>

                            <div className="text-center text-xs text-zinc-500">
                                WIN %
                            </div>

                            <div className="text-right font-semibold">
                                {(game.away_season_win_pct * 100).toFixed(1)}%
                            </div>
                        </div>

                        {/* BADNESS */}
                        <div className="grid grid-cols-3 items-center border-b border-zinc-800 p-5">
                            <div className="text-left font-semibold">
                                {(game.home_badness * 100).toFixed(1)}%
                            </div>

                            <div className="text-center text-xs text-zinc-500">
                                BADNESS
                            </div>

                            <div className="text-right font-semibold">
                                {(game.away_badness * 100).toFixed(1)}%
                            </div>
                        </div>

                        {/* POINT DIFF */}
                        <div className="grid grid-cols-3 items-center p-5">
                            <div className="text-left font-semibold">
                                {(game.home_season_point_diff ?? 0) >= 0
                                    ? `+${game.home_season_point_diff ?? 0}`
                                    : game.home_season_point_diff ?? 0}
                            </div>

                            <div className="text-center text-xs text-zinc-500">
                                POINT DIFF
                            </div>

                            <div className="text-right font-semibold">
                                {(game.away_season_point_diff ?? 0) >= 0
                                    ? `+${game.away_season_point_diff ?? 0}`
                                    : game.away_season_point_diff ?? 0}
                            </div>
                        </div>

                    </div>
                </section>

                {/* RECENT GAMES */}
                <section className="mt-8">
                    <h2 className="mb-4 text-xl font-semibold">
                        Last 5 Games
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">

                        {/* HOME RECENT */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                            <h3 className="font-semibold">
                                {game.home_full_name}
                            </h3>

                            <div className="mt-4">
                                {!!game.home_recent_games && game.home_recent_games.length === 0 ? (
                                    <div className="py-4 text-sm text-zinc-500">
                                        No recent games.
                                    </div>
                                ) : (
                                    game.home_recent_games?.slice(0, 5).map((recent_game) => {
                                        const isHome =
                                            recent_game.home_full_name === game.home_full_name;

                                        const teamScore = isHome
                                            ? recent_game.home_score
                                            : recent_game.away_score;

                                        const opponentScore = isHome
                                            ? recent_game.away_score
                                            : recent_game.home_score;

                                        const opponent = isHome
                                            ? recent_game.away_name
                                            : recent_game.home_name;

                                        if (teamScore === null || opponentScore === null) {
                                            return null;
                                        }

                                        const won = teamScore > opponentScore;
                                        const tie = teamScore === opponentScore;

                                        return (
                                            <Link
                                                key={recent_game.game_id}
                                                href={`/${league}/preview/${recent_game.game_id}?date=${recent_game.date.slice(0, 10)}`}
                                                target="_blank"
                                                className="
                                                    no-underline!
                                                    flex
                                                    items-center
                                                    justify-between
                                                    border-b
                                                    border-zinc-800
                                                    p-3
                                                    last:border-b-0
                                                    transition
                                                    duration-150
                                                    hover:bg-zinc-800/50
                                                    active:scale-[0.99]
                                                    active:bg-zinc-800
                                                "
                                            >
                                                <div>
                                                    <div className="text-xs mb-1 text-zinc-500">
                                                        {new Date(recent_game.date).toLocaleDateString([], {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })}
                                                    </div>
                                                    <div className="text-sm">
                                                        <span
                                                            className={
                                                                won
                                                                    ? "text-green-400"
                                                                    : tie
                                                                        ? "text-yellow-400"
                                                                        : "text-red-400"
                                                            }
                                                        >
                                                            {won ? "W" : tie ? "T" : "L"}
                                                        </span>{" "}
                                                        {teamScore} - {opponentScore}
                                                    </div>

                                                    <div className="text-xs text-zinc-500">
                                                        {isHome ? "vs " : "@ "}{opponent}
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 text-sm font-semibold">
                                                    <div
                                                        className="text-center"
                                                        style={{
                                                            color: getHeatColour(recent_game.slop_percentile),
                                                        }}
                                                    >
                                                        <div className="text-[10px] text-zinc-500">
                                                            SLOP
                                                        </div>
                                                        {(recent_game.slop_percentile * 100).toFixed(0)}%
                                                    </div>

                                                    <div
                                                        className="text-center"
                                                        style={{
                                                            color: getHeatColour(1 - recent_game.watchability_percentile),
                                                        }}
                                                    >
                                                        <div className="text-[10px] text-zinc-500">
                                                            WATCHABILITY
                                                        </div>
                                                        {(recent_game.watchability_percentile * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* AWAY RECENT */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                            <h3 className="font-semibold">
                                {game.away_name}
                            </h3>

                            <div className="mt-4">
                                {!!game.away_recent_games && game.away_recent_games.length === 0 ? (
                                    <div className="py-4 text-sm text-zinc-500">
                                        No recent games.
                                    </div>
                                ) : (
                                    game.away_recent_games?.slice(0, 5).map((recent_game) => {
                                        const isHome =
                                            recent_game.home_full_name === game.away_full_name;

                                        const teamScore = isHome
                                            ? recent_game.home_score
                                            : recent_game.away_score;

                                        const opponentScore = isHome
                                            ? recent_game.away_score
                                            : recent_game.home_score;

                                        const opponent = isHome
                                            ? recent_game.away_name
                                            : recent_game.home_name;

                                        if (teamScore === null || opponentScore === null) {
                                            return null;
                                        }

                                        const won = teamScore > opponentScore;
                                        const tie = teamScore === opponentScore;

                                        return (
                                            <Link
                                                key={recent_game.game_id}
                                                href={`/${league}/preview/${recent_game.game_id}?date=${recent_game.date.slice(0, 10)}`}
                                                target="_blank"
                                                className="
                                                    no-underline!
                                                    flex
                                                    items-center
                                                    justify-between
                                                    border-b
                                                    border-zinc-800
                                                    p-3
                                                    last:border-b-0
                                                    transition
                                                    duration-150
                                                    hover:bg-zinc-800/50
                                                    active:scale-[0.99]
                                                    active:bg-zinc-800
                                                "
                                            >
                                                <div>
                                                    <div className="text-xs mb-1 text-zinc-500">
                                                        {new Date(recent_game.date).toLocaleDateString([], {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })}
                                                    </div>
                                                    <div className="text-sm">
                                                        <span
                                                            className={
                                                                won
                                                                    ? "text-green-400"
                                                                    : tie
                                                                        ? "text-yellow-400"
                                                                        : "text-red-400"
                                                            }
                                                        >
                                                            {won ? "W" : tie ? "T" : "L"}
                                                        </span>{" "}
                                                        {teamScore} - {opponentScore}
                                                    </div>

                                                    <div className="text-xs text-zinc-500">
                                                        {isHome ? "vs " : "@ "}{opponent}
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 text-sm font-semibold">
                                                    <div
                                                        className="text-center"
                                                        style={{
                                                            color: getHeatColour(recent_game.slop_percentile),
                                                        }}
                                                    >
                                                        <div className="text-[10px] text-zinc-500">
                                                            SLOP
                                                        </div>
                                                        {(recent_game.slop_percentile * 100).toFixed(0)}%
                                                    </div>

                                                    <div
                                                        className="text-center"
                                                        style={{
                                                            color: getHeatColour(1 - recent_game.watchability_percentile),
                                                        }}
                                                    >
                                                        <div className="text-[10px] text-zinc-500">
                                                            WATCHABILITY
                                                        </div>
                                                        {(recent_game.watchability_percentile * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                    </div>
                </section>

            </div>
        </main>
    );
}