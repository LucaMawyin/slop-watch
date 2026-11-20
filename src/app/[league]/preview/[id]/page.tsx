"use client";

import AddToCalendar from "@/components/AddToCalendar";
import Badge from "@/components/Badge";
import { useNotifications } from "@/components/NotificationProvider";
import PreviewSkeleton from "@/components/PreviewSkeleton";
import TeamLogo from "@/components/TeamLogo";
import { getHeatColour } from "@/lib/getHeatColour";
import { getLocalDate } from "@/lib/getLocalDate";
import { getSlopBadge } from "@/lib/getSlopBadge";
import { leagues } from "@/lib/leagues";
import { slugify } from "@/lib/slugify";
import { Game, LiveScore } from "@/lib/types";
import { AlertCircle, ArrowLeft } from "lucide-react";
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

    const { notify, dismiss, dismissAll } = useNotifications();

    const { league, id } = use(params);
    const searchParams = useSearchParams();
    const date = searchParams.get("date");
    const ref = searchParams.get("ref");

    const [start, end] = ref?.split("_") ?? [];

    const [game, setGame] = useState<Game | null>(null);
    const gameRef = useRef<Game | null>(null);
    const hasFetchedScore = useRef(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchPreview = async () => {
            try {
                setLoading(true);
                gameRef.current = null;
                setGame(null);
                setError(null);
                hasFetchedScore.current = false;

                if (!date) {
                    throw new Error("Missing game date");
                }

                // Get the latest data version
                const versionResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/version`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!versionResponse.ok) {
                    throw new Error("Failed to check data version.");
                }

                const { version } = await versionResponse.json() as any;

                const params = new URLSearchParams({
                    league,
                    date,
                    version: String(version),
                });

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/game/${id}?${params}`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error(`Games API failed: ${response.status}`);
                }
                const gameData: Game = await response.json();

                if (controller.signal.aborted) return;

                // Render game without waiting for live score
                gameRef.current = gameData;
                setGame(gameData);

            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name === "AbortError"
                ) {
                    return;
                }

                console.error(error);

                setError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load game preview"
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchPreview();

        return () => controller.abort();
    }, [id, league, date]);

    useEffect(() => {
        const controller = new AbortController();
        let updating = false;

        const updateScore = async () => {
            const currentGame = gameRef.current;

            if (
                !currentGame ||
                currentGame.actual_slop !== null ||
                new Date(currentGame.date).getTime() > Date.now() ||
                updating
            ) {
                return;
            }

            updating = true;

            const notificationId = !hasFetchedScore.current
                ? notify("Fetching live score...", "info", null)
                : null;

            hasFetchedScore.current = true;

            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/game/${id}/score?league=${encodeURIComponent(league)}&date=${encodeURIComponent(currentGame.date)}`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error(`Score request failed: ${response.status}`);
                }

                const score: LiveScore = await response.json();

                if (!controller.signal.aborted) {
                    const latestGame = gameRef.current;

                    if (!latestGame) return;

                    const updatedGame = {
                        ...latestGame,
                        home_score: score.home_score,
                        away_score: score.away_score,
                    };

                    gameRef.current = updatedGame;
                    setGame(updatedGame);
                }
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name !== "AbortError"
                ) {
                    console.error(`Failed to fetch score for ${id}:`, error);
                    notify("Failed to fetch live score.", "error");
                }
            } finally {
                updating = false;

                if (notificationId !== null) {
                    dismiss(notificationId);
                }
            }
        };

        // Fetch immediately then refresh every minute
        updateScore();

        const interval = setInterval(
            updateScore,
            60 * 1000
        );

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [id, league, game !== null]);

    if (loading) {
        return (
            <main className="p-6 text-white">

                <div className="mx-auto max-w-5xl">

                    <PreviewSkeleton />
                </div>
            </main>
        );
    }

    if (error || !game) {
        return (
            <main className="
                flex 
                flex-1
                items-center 
                justify-center 
                px-6 py-12 
                text-white
            ">
                <div className="
                    w-full 
                    max-w-md 
                    text-center
                ">
                    <div className="
                        mx-auto 
                        mb-5 
                        flex 
                        h-16 
                        w-16 
                        items-center 
                        justify-center 
                        rounded-full 
                        bg-red-500/10
                    ">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>

                    <h1 className="
                        text-2xl 
                        font-bold 
                        tracking-tight
                    ">
                        Unable to Load Game
                    </h1>

                    <p className="
                        mt-3 
                        text-sm 
                        leading-relaxed 
                        text-gray-400
                    ">
                        {error ?? "We couldn't load this game preview. It may be unavailable or no longer exist."}
                    </p>

                    <Link
                        href={`/${league}/games${start ? `?start=${start}` : ""}${end ? `&end=${end}` : ""}`}
                        className="
                            mt-7 
                            inline-flex 
                            items-center 
                            gap-2 
                            rounded-lg 
                            bg-white 
                            px-5 
                            py-3 
                            text-sm 
                            font-semibold 
                            text-black 
                            transition 
                            hover:bg-gray-200
                            hover:no-underline!
                            hover:text-black!
                        "
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Games
                    </Link>
                </div>
            </main>
        );
    }

    const slop =
        typeof game.slop_percentile === "number" &&
        Number.isFinite(game.slop_percentile)
            ? game.slop_percentile
            : 0;

    const watchability =
        typeof game.watchability_percentile === "number" &&
        Number.isFinite(game.watchability_percentile)
            ? game.watchability_percentile
            : 0;

    const slopColour = getHeatColour(slop);
    const watchabilityColour = getHeatColour(1 - watchability);

    const badge = getSlopBadge(slop, watchability);

    const isFinal = game.actual_slop !== null;
    const isLive = !isFinal && new Date(game.date) <= new Date();

    return (
        <main className="w-full p-6 text-white">
            <div className="mx-auto max-w-5xl">

                {/* HEADER */}
                <div className="
                    flex
                    flex-col
                    items-center
                    justify-center
                    text-center
                ">

                    <Link
                        href={`/${league}/games`}
                        className="
                            mb-1 
                            block
                            w-fit 
                            font-medium 
                            text-zinc-400 
                        "
                    >
                        {leagues.find((item) => item.id === league)?.name ?? league}
                    </Link>

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
                        flex-wrap
                        items-center 
                        justify-between 
                        gap-4 
                        sm:gap-8
                        sm:flex-nowrap
                    ">

                        {/* HOME */}
                        <div className="w-0 flex-1 text-center">
                            <div className="text-zinc-500">
                                HOME
                            </div>
                            <Link
                                href={`/${league}/teams/${slugify(game.home_name)}?id=${game.home_id}`}
                                target="_blank"
                                className="
                                    flex
                                    flex-col
                                    w-full
                                    justify-center
                                    items-center
                                    wrap-break-words 
                                    text-[clamp(1.25rem,4vw,2.25rem)]
                                    font-bold 
                                    hover:underline 
                                "
                            >
                                {game.home_full_name}
                                <TeamLogo
                                    league={game.league}
                                    teamId={game.home_id}
                                    teamName={game.home_name}
                                />
                            </Link>
                        </div>

                        {/* VS / DESKTOP SCORE */}
                        <div className="
                            flex
                            shrink-0
                            flex-col
                            items-center
                            justify-center
                            text-center
                        ">
                            <div className="
                                text-lg
                                font-semibold
                                text-zinc-500
                                sm:hidden
                                px-1
                            ">
                                VS
                            </div>

                            <div className="hidden sm:block">
                                {(
                                    game.actual_slop !== null ||
                                    (
                                        new Date(game.date) <= new Date() &&
                                        game.home_score !== null &&
                                        game.away_score !== null
                                    )
                                ) ? (
                                    <>
                                        {game.actual_slop === null && (
                                            <div className="mb-1 flex items-center justify-center text-xs font-semibold text-green-400">
                                                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                                                LIVE
                                            </div>
                                        )}
                                        <div className="
                                            flex
                                            flex-col
                                            items-center
                                            gap-2
                                            text-4xl 
                                            font-bold 
                                            text-white
                                        ">
                                            {isFinal && (
                                                <Badge
                                                    title={"FINAL"}
                                                    x={3}
                                                    y={1}
                                                    className="border-none w-fit"
                                                    bgColour={"bg-sky-950"}
                                                    textColour={"text-sky-400"}
                                                />                                                
                                            )}

                                            {game.home_score} - {game.away_score}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-lg font-semibold text-zinc-500">
                                        VS
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AWAY */}
                        <div className="w-0 flex-1 text-center">
                            <div className="text-zinc-500">
                                AWAY
                            </div>
                            <Link
                                href={`/${league}/teams/${slugify(game.away_name)}?id=${game.away_id}`}
                                target="_blank"
                                className="
                                    flex
                                    flex-col
                                    w-full
                                    justify-center
                                    items-center
                                    wrap-break-words 
                                    text-[clamp(1.25rem,4vw,2.25rem)]
                                    font-bold 
                                    hover:underline 
                                "
                            >
                                {game.away_full_name}
                                <TeamLogo
                                    league={game.league}
                                    teamId={game.away_id}
                                    teamName={game.away_name}
                                />
                            </Link>
                        </div>

                    </div>

                    {/* MOBILE SCORE */}
                    {(
                        game.actual_slop !== null ||
                        (
                            new Date(game.date) <= new Date() &&
                            game.home_score !== null &&
                            game.away_score !== null
                        )
                    ) && (
                        <div className="
                            mt-4
                            text-center
                            flex
                            flex-col
                            sm:hidden
                            w-full
                            gap-4
                        ">
                            {isLive && (
                                <Badge
                                    title={isFinal ? "FINAL" : "LIVE"}
                                    x={3}
                                    y={1}
                                    className="border-none w-fit self-center"
                                    bgColour={"bg-green-950"}
                                    textColour={"text-green-400"}
                                >
                                    <span className="
                                        h-1.5
                                        w-1.5
                                        animate-pulse
                                        rounded-full
                                        bg-green-400
                                    " />
                                </Badge>
                            )}


                                
                            <div className="
                                flex
                                flex-row
                                w-full
                                items-center
                                justify-center
                                text-4xl 
                                font-bold 
                                text-white
                                gap-8
                            ">
                                <div className="w-0 flex-1 text-center">
                                    {game.home_score}
                                </div>
                                {isFinal ? (
                                    <Badge
                                        title={"FINAL"}
                                        x={3}
                                        y={1}
                                        className="border-none w-fit mt-1"
                                        bgColour={"bg-sky-950"}
                                        textColour={"text-sky-400"}
                                    />                                                
                                ) : (
                                    <div>-</div>
                                )}
                                <div className="w-0 flex-1 text-center">
                                    {game.away_score}
                                </div>   
                            </div>

                        </div>
                    )}

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

                    {new Date(game.date) > new Date() && (
                        <div className="mt-4 w-full max-w-xs">
                            <AddToCalendar game={game} />
                        </div>
                    )}
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

                            <Link
                                href={`/${league}/teams/${slugify(game.home_name)}?id=${game.home_id}`}
                                target="_blank"
                                className="
                                    font-semibold 
                                    flex
                                    flex-col
                                    sm:flex-row
                                    items-center 
                                    justify-start
                                    gap-2
                                "
                            >
                                <TeamLogo
                                    league={game.league}
                                    teamId={game.home_id}
                                    teamName={game.home_full_name}
                                    className="h-5 w-5"
                                />

                                <div className="font-semibold">
                                    {game.home_full_name}
                                </div>
                            </Link>
                            

                            <div className="my-auto text-xs text-zinc-500">
                                TEAM
                            </div>

                            <Link
                                href={`/${league}/teams/${slugify(game.away_name)}?id=${game.away_id}`}
                                target="_blank"
                                className="
                                    font-semibold 
                                    flex
                                    flex-col
                                    sm:flex-row
                                    items-center 
                                    justify-end
                                    gap-2
                                "
                            >
                                <TeamLogo
                                    league={game.league}
                                    teamId={game.away_id}
                                    teamName={game.away_full_name}
                                    className="h-5 w-5"
                                />

                                <div className="font-semibold">
                                    {game.away_full_name}
                                </div>
                            </Link>
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

                            <Link
                                href={`/${league}/teams/${slugify(game.home_name)}?id=${game.home_id}`}
                                target="_blank"
                                className="flex items-center gap-2"
                            >
                                <TeamLogo
                                    league={game.league}
                                    teamId={game.home_id}
                                    teamName={game.home_full_name}
                                    className="h-5 w-5"
                                />

                                <h3 className="font-semibold">
                                    {game.home_full_name}
                                </h3>
                            </Link>

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
                                                href={`/${league}/preview/${recent_game.game_id}?date=${getLocalDate(recent_game.date)}`}
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
                            <Link
                                href={`/${league}/teams/${slugify(game.away_name)}?id=${game.away_id}`}
                                target="_blank"
                                className="flex items-center gap-2"
                            >
                                <TeamLogo
                                    league={game.league}
                                    teamId={game.away_id}
                                    teamName={game.away_full_name}
                                    className="h-5 w-5"
                                />

                                <h3 className="font-semibold">
                                    {game.away_full_name}
                                </h3>
                            </Link>

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
                                                href={`/${league}/preview/${recent_game.game_id}?date=${getLocalDate(recent_game.date)}`}
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