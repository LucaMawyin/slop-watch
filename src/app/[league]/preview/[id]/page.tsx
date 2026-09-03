"use client";

import Badge from "@/components/Badge";
import PreviewSkeleton from "@/components/PreviewSkeleton";
import { getHeatColour } from "@/lib/getHeatColour";
import { getSlopBadge } from "@/lib/getSlopBadge";
import { slugify } from "@/lib/slugify";
import { Game, Team } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";

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
    const [homeTeam, setHomeTeam] = useState<Team | null>(null);
    const [awayTeam, setAwayTeam] = useState<Team | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPreview() {
            try {
                setLoading(true);
                setError(null);

                // Fetch game
                const selectedDate = new Date(`${date ?? ""}T00:00:00`);

                const startDate = new Date(selectedDate);
                startDate.setDate(startDate.getDate() - 1);

                const endDate = new Date(selectedDate);
                endDate.setDate(endDate.getDate() + 1);

                const formatDate = (d: Date) =>
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

                const gameResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/games?league=${league}&start=${formatDate(startDate)}&end=${formatDate(endDate)}&id=${id}`
                );

                if (!gameResponse.ok) {
                    throw new Error(
                        `Game API failed: ${gameResponse.status}`
                    );
                }

                const games = await gameResponse.json() as Game[];
                const gameData = games[0];

                if (!gameData) {
                    throw new Error("Game not found");
                }

                // Fetch both teams concurrently
                const [homeResponse, awayResponse] = await Promise.all([
                    fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/team/${league}/${slugify(gameData.home_name)}`
                    ),
                    fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/team/${league}/${slugify(gameData.away_name)}`
                    ),
                ]);

                if (!homeResponse.ok || !awayResponse.ok) {
                    throw new Error("Failed to fetch team data");
                }

                const [homeData, awayData] = await Promise.all([
                    homeResponse.json() as Promise<Team>,
                    awayResponse.json() as Promise<Team>,
                ]);

                setGame(gameData);
                setHomeTeam(homeData);
                setAwayTeam(awayData);

            } catch (error) {
                console.error(error);

                setError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load game preview"
                );
            } finally {
                setLoading(false);
            }
        }

        fetchPreview();
    }, [league, id, date]);

    if (loading) {
        return (
            <main className="p-6 text-white">
                <div className="mx-auto max-w-5xl">
                    <PreviewSkeleton />
                </div>
            </main>
        );
    }

    if (error || !game || !homeTeam || !awayTeam) {
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

    const slop = game.slop_percentile;
    const watchability = game.watchability_percentile;

    const slopColour = getHeatColour(slop);
    const watchabilityColour = getHeatColour(1 - watchability);

    const badge = getSlopBadge(slop, watchability);

    return (
        <main className="w-full p-6 text-white">
            <div className="mx-auto max-w-5xl">

                {/* BACK */}
                <Link
                    href={`/games?league=${league}${start ? `&start=${start}` : ""}${end ? `&end=${end}` : ""}`}
                    className="mb-4 block hover:underline"
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
                            hour: "numeric",
                            minute: "2-digit",
                        })}
                    </div>

                    <div className="mx-auto mt-6 flex w-full max-w-3xl items-center justify-between gap-4 sm:gap-8">

                        {/* HOME */}
                        <div className="w-0 flex-1 text-center">
                            <div className="text-zinc-500">
                                HOME
                            </div>
                            <Link
                                href={`/${league}/teams/${slugify(homeTeam.team)}`}
                                target="_blank"
                                className="wrap-break-words text-2xl font-bold hover:underline sm:text-4xl"
                            >
                                {homeTeam.team}
                            </Link>
                        </div>

                        {/* SCORE / VS */}
                        <div className="shrink-0 text-center text-lg font-semibold text-zinc-500">
                            {game.actual_slop !== null ? (
                                <div className="text-4xl font-bold text-white">
                                    {game.away_score} - {game.home_score}
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
                                href={`/${league}/teams/${slugify(awayTeam.team)}`}
                                target="_blank"
                                className="wrap-break-words text-2xl font-bold hover:underline sm:text-4xl"
                            >
                                {awayTeam.team}
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
                        Team Comparison
                    </h2>

                    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">

                        {/* HEADER */}
                        <div className="grid grid-cols-3 border-b border-zinc-800 p-5 text-center">
                            <div className="text-left font-semibold">
                                {homeTeam.team}
                            </div>

                            <div className="text-xs text-zinc-500">
                                TEAM
                            </div>

                            <div className="text-right font-semibold">
                                {awayTeam.team}
                            </div>
                        </div>

                        {/* RECORD */}
                        <div className="grid grid-cols-3 items-center border-b border-zinc-800 p-5">
                            <div className="text-left font-semibold">
                                {homeTeam.record.wins} - {homeTeam.record.losses}
                            </div>

                            <div className="text-center text-xs text-zinc-500">
                                RECORD
                            </div>

                            <div className="text-right font-semibold">
                                {awayTeam.record.wins} - {awayTeam.record.losses}
                            </div>
                        </div>

                        {/* WIN % */}
                        <div className="grid grid-cols-3 items-center border-b border-zinc-800 p-5">
                            <div className="text-left font-semibold">
                                {(homeTeam.win_pct * 100).toFixed(1)}%
                            </div>

                            <div className="text-center text-xs text-zinc-500">
                                WIN %
                            </div>

                            <div className="text-right font-semibold">
                                {(awayTeam.win_pct * 100).toFixed(1)}%
                            </div>
                        </div>

                        {/* BADNESS */}
                        <div className="grid grid-cols-3 items-center border-b border-zinc-800 p-5">
                            <div className="text-left font-semibold">
                                {(homeTeam.team_badness * 100).toFixed(1)}%
                            </div>

                            <div className="text-center text-xs text-zinc-500">
                                BADNESS
                            </div>

                            <div className="text-right font-semibold">
                                {(awayTeam.team_badness * 100).toFixed(1)}%
                            </div>
                        </div>

                        {/* POINT DIFF */}
                        <div className="grid grid-cols-3 items-center p-5">
                            <div className="text-left font-semibold">
                                {homeTeam.point_diff >= 0
                                    ? `+${homeTeam.point_diff}`
                                    : homeTeam.point_diff}
                            </div>

                            <div className="text-center text-xs text-zinc-500">
                                POINT DIFF
                            </div>

                            <div className="text-right font-semibold">
                                {awayTeam.point_diff >= 0
                                    ? `+${awayTeam.point_diff}`
                                    : awayTeam.point_diff}
                            </div>
                        </div>

                    </div>
                </section>

                {/* RECENT FORM */}
                <section className="mt-8">
                    <h2 className="mb-4 text-xl font-semibold">
                        Recent Form
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">

                        {/* HOME RECENT */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                            <h3 className="font-semibold">
                                {homeTeam.team}
                            </h3>

                            <div className="mt-4">
                                {homeTeam.recent_games.slice(0, 5).map((game) => {
                                    const isHome =
                                        game.home_name === homeTeam.team;

                                    const teamScore = isHome
                                        ? game.home_score
                                        : game.away_score;

                                    const opponentScore = isHome
                                        ? game.away_score
                                        : game.home_score;

                                    const opponent = isHome
                                        ? game.away_name
                                        : game.home_name;

                                    const won = teamScore > opponentScore;
                                    const tie = teamScore === opponentScore;

                                    return (
                                        <Link
                                            key={game.game_id}
                                            href={`/${league}/preview/${game.game_id}?date=${game.date.slice(0, 10)}`}
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
                                                    {opponent}
                                                </div>
                                            </div>

                                            <div className="flex gap-4 text-sm font-semibold">
                                                <div
                                                    className="text-center"
                                                    style={{
                                                        color: getHeatColour(game.slop_percentile),
                                                    }}
                                                >
                                                    <div className="text-[10px] text-zinc-500">
                                                        SLOP
                                                    </div>
                                                    {(game.slop_percentile * 100).toFixed(0)}%
                                                </div>

                                                <div
                                                    className="text-center"
                                                    style={{
                                                        color: getHeatColour(1 - game.watchability_percentile),
                                                    }}
                                                >
                                                    <div className="text-[10px] text-zinc-500">
                                                        WATCHABILITY
                                                    </div>
                                                    {(game.watchability_percentile * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* AWAY RECENT */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                            <h3 className="font-semibold">
                                {awayTeam.team}
                            </h3>

                            <div className="mt-4">
                                {awayTeam.recent_games.slice(0, 5).map((game) => {
                                    const isHome =
                                        game.home_name === awayTeam.team;

                                    const teamScore = isHome
                                        ? game.home_score
                                        : game.away_score;

                                    const opponentScore = isHome
                                        ? game.away_score
                                        : game.home_score;

                                    const opponent = isHome
                                        ? game.away_name
                                        : game.home_name;

                                    const won = teamScore > opponentScore;
                                    const tie = teamScore === opponentScore;

                                    return (
                                        <Link
                                            key={game.game_id}
                                            href={`/${league}/preview/${game.game_id}?date=${game.date.slice(0, 10)}`}
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
                                                    {opponent}
                                                </div>
                                            </div>

                                            <div className="flex gap-4 text-sm font-semibold">
                                                <div
                                                    className="text-center"
                                                    style={{
                                                        color: getHeatColour(game.slop_percentile),
                                                    }}
                                                >
                                                    <div className="text-[10px] text-zinc-500">
                                                        SLOP
                                                    </div>
                                                    {(game.slop_percentile * 100).toFixed(0)}%
                                                </div>

                                                <div
                                                    className="text-center"
                                                    style={{
                                                        color: getHeatColour(1 - game.watchability_percentile),
                                                    }}
                                                >
                                                    <div className="text-[10px] text-zinc-500">
                                                        WATCHABILITY
                                                    </div>
                                                    {(game.watchability_percentile * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </section>

            </div>
        </main>
    );
}