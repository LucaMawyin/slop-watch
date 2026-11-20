"use client";

import Badge from "@/components/Badge";
import ShowMoreButton from "@/components/ShowMoreButton";
import TeamLogo from "@/components/TeamLogo";
import TeamSkeleton from "@/components/TeamSkeleton";
import { getGameBadge } from "@/lib/getGameBadge";
import { getHeatColour } from "@/lib/getHeatColour";
import { getLocalDate } from "@/lib/getLocalDate";
import { getSlopBadge } from "@/lib/getSlopBadge";
import { leagues } from "@/lib/leagues";
import { slugify, unslugify } from "@/lib/slugify";
import { Game, Team } from "@/lib/types";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

type Props = {
    params: Promise<{
        league: string;
        team: string;
    }>;
};

export default function TeamPage({ params }: Props) {
    const { league, team: teamSlug } = use(params);

    const router = useRouter();
    const searchParams = useSearchParams();

    const teamId = searchParams.get("id");
    const ref = searchParams.get("ref");
    const [start, end] = ref?.split("_") ?? [];

    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [ recentGamesCount, setRecentGamesCount ] = useState(3);
    const [ upcomingGamesCount, setUpcomingGamesCount ] = useState(3);
    const [error, setError] = useState<string | null>(null);

    const slug = slugify(teamSlug);

    const displayTeamName = team?.team.full_name ?? unslugify(teamSlug);
    const teamName = team?.team.name ?? unslugify(teamSlug);

    useEffect(() => {
        if (teamSlug !== slug) {
            const params = new URLSearchParams();

            if (teamId) params.set("id", teamId);
            if (ref) params.set("ref", ref);

            router.replace(
                `/${league}/${slug}${params.toString() ? `?${params.toString()}` : ""}`
            );

            return;
        }

        const controller = new AbortController();

        async function fetchTeam() {
            try {
                setLoading(true);
                setError(null);

                // Get current data version
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

                const query = new URLSearchParams();

                if (teamId) query.set("id", teamId);

                query.set("version", String(version));

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/team/${league}/${slug}?${query}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error(
                        response.status === 404
                            ? "Team not found."
                            : "Failed to load team data."
                    );
                }

                const data: Team = await response.json();

                if (!controller.signal.aborted) {
                    setTeam(data);
                }
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }

                console.error(error);

                if (!controller.signal.aborted) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "An unexpected error occurred."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchTeam();

        return () => controller.abort();
    }, [league, slug, teamSlug, teamId, ref, router]);

    const teamRef = useRef<Team | null>(null);

    useEffect(() => {
        teamRef.current = team;
    }, [team]);

    useEffect(() => {
        if (!team) {
            return;
        }

        const updateLiveGames = async () => {
            const currentTeam = teamRef.current;

            if (!currentTeam) {
                return;
            }

            const now = new Date();

            const liveGames = currentTeam.upcoming_games.filter(
                (game) => game.actual_slop === null &&
                        new Date(game.date).getTime() <= now.getTime()
            );

            for (const game of liveGames) {
                try {
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/game/${game.game_id}/score?league=${league}&date=${encodeURIComponent(game.date)}`,
                        {
                            cache: "no-store",
                        }
                    );

                    if (!response.ok) {
                        continue;
                    }

                    const updatedGame = await response.json() as Game;

                    setTeam((current) => {
                        if (!current) {
                            return current;
                        }

                        return {
                            ...current,
                            upcoming_games: current.upcoming_games.map((currentGame) =>
                                String(currentGame.game_id) === String(game.game_id)
                                    ? {
                                        ...currentGame,
                                        home_score: updatedGame.home_score ?? currentGame.home_score,
                                        away_score: updatedGame.away_score ?? currentGame.away_score,
                                        actual_slop: updatedGame.actual_slop ?? currentGame.actual_slop,
                                        actual_watchability: updatedGame.actual_watchability ?? currentGame.actual_watchability,
                                        watchability_percentile: updatedGame.watchability_percentile ?? currentGame.watchability_percentile,
                                        slop_percentile: updatedGame.slop_percentile ?? currentGame.slop_percentile,
                                    }
                                    : currentGame
                            ),
                        };
                    });

                } catch (error) {
                    console.error(
                        `Failed to update live game ${game.game_id}:`,
                        error
                    );
                }
            }
        };

        // Run immediately after team has loaded
        updateLiveGames();

        // Update every minute
        const interval = setInterval(
            updateLiveGames,
            60 * 1000
        );

        return () => {
            clearInterval(interval);
        };
    }, [team !== null, league]);

    const liveGames = team?.upcoming_games.filter(
        (game) => {
            const age = Date.now() - new Date(game.date).getTime();

            return age >= 0 && age <= 6 * 60 * 60 * 1000;
        }
    );

    const upcomingGames = team?.upcoming_games.filter(
        (game) =>
            new Date(game.date) > new Date()
    );


    return (
        <div className="w-full p-6 text-white">
            <div className="mx-auto max-w-5xl">

                {/* PAGE HEADER */}
                <div className="mb-8">

                    <div className="mt-1 flex items-center gap-4">
                        <TeamLogo
                            league={league}
                            teamId={teamId}
                            teamName={teamName}
                            displayName={displayTeamName}
                        />

                        <div>
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

                            <h1 className="text-4xl font-bold">
                                {displayTeamName}
                            </h1>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <TeamSkeleton/>
                ) : team ? (
                    <>

                        {/* TEAM STATS */}
                        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                                <div className="text-xs text-zinc-500">
                                    RECORD
                                </div>
                                <div className="mt-2 text-2xl font-semibold">
                                    {team.record.wins} - {team.record.losses}
                                </div>
                            </div>

                            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                                <div className="text-xs text-zinc-500">
                                    WIN %
                                </div>
                                <div className="mt-2 text-2xl font-semibold">
                                    {(team.win_pct * 100).toFixed(1)}%
                                </div>
                            </div>

                            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                                <div className="text-xs text-zinc-500">
                                    BADNESS
                                </div>
                                <div className="mt-2 text-2xl font-semibold">
                                    {(team.team_badness * 100).toFixed(1)}%
                                </div>
                            </div>

                            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                                <div className="text-xs text-zinc-500">
                                    POINT DIFF
                                </div>
                                <div className="mt-2 text-2xl font-semibold">
                                    {team.point_diff >= 0 ? `+${team.point_diff}` : team.point_diff}
                                </div>
                            </div>


                        </section>
                        
                        {liveGames && liveGames.length > 0 && (
                            <section className="mt-8">
                                <h2 className="mb-4 text-xl font-semibold">
                                    Live
                                </h2>

                                <div className="rounded-xl border border-zinc-800 bg-zinc-900">
                                    {liveGames.map((game) => {

                                        const isHome =
                                            game.home_full_name === team.team.full_name;

                                        const opponent = isHome
                                            ? game.away_name
                                            : game.home_name;

                                        const slop = game.slop_percentile;
                                        const watchability = game.watchability_percentile;

                                        const badge = getGameBadge(game);

                                        return (
                                            <Link
                                                href={`/${league}/preview/${game.game_id}?date=${getLocalDate(game.date)}`}
                                                target="_blank"
                                                key={game.game_id}
                                                className="
                                                    relative
                                                    flex
                                                    flex-col
                                                    items-center
                                                    p-5
                                                    border-b
                                                    border-zinc-800
                                                    last:border-b-0
                                                    no-underline!
                                                    transition
                                                    hover:bg-zinc-800/50
                                                    sm:flex-row
                                                    sm:items-center
                                                    sm:justify-between
                                                "
                                            >
                                                {/* Game Info */}
                                                <div className="
                                                    w-full
                                                    flex 
                                                    justify-between
                                                    
                                                ">
                                                    <div className="
                                                        w-auto
                                                        flex
                                                        flex-col
                                                        gap-1
                                                    ">
                                                        {badge && (
                                                            <Badge
                                                                title={badge.title}
                                                                x={3}
                                                                y={1}
                                                                colour={badge.colour}
                                                                className="w-fit mb-1"
                                                            />
                                                        )}

                                                        <p className="text-sm">
                                                            {new Date(game.date).toLocaleDateString()}
                                                        </p>

                                                        <h1 className="font-medium">
                                                            <span className="font-bold">
                                                                {team.team.name}
                                                            </span>
                                                            {isHome ? " vs " : " @ "}
                                                            {opponent}
                                                        </h1>

                                                        <p className="text-sm">
                                                            {game.venue_full_name}
                                                        </p>
                                                    </div>   

                                                    <div className="
                                                        mt-2 
                                                        flex 
                                                        sm:hidden
                                                        text-center
                                                        items-center
                                                        gap-4
                                                    ">
                                                        <div>
                                                            <p className="text-xs">
                                                                Slop
                                                            </p>

                                                            <p
                                                                className="text-lg font-semibold"
                                                                style={{
                                                                    color: game.slop_percentile !== null
                                                                        ? getHeatColour(game.slop_percentile)
                                                                        : undefined,
                                                                }}
                                                            >
                                                                {game.slop_percentile !== null
                                                                    ? `${(game.slop_percentile * 100).toFixed(1)}%`
                                                                    : "—"}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-xs">
                                                                Watchability
                                                            </p>

                                                            <p
                                                                className="text-lg font-semibold"
                                                                style={{
                                                                    color: game.watchability_percentile !== null
                                                                        ? getHeatColour(1 - game.watchability_percentile)
                                                                        : undefined,
                                                                }}
                                                            >
                                                                {game.watchability_percentile !== null
                                                                    ? `${(game.watchability_percentile * 100).toFixed(1)}%`
                                                                    : "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                               
                                                </div>


                                                {/* Live Score */}
                                                <div className="
                                                    relative 
                                                    text-center 
                                                    sm:absolute 
                                                    sm:left-1/2 
                                                    sm:-translate-x-1/2
                                                ">
                                                    <p className="text-md mb-4 font-semibold text-green-400!">
                                                        LIVE
                                                    </p>

                                                    <p className="text-4xl font-bold text-white!">
                                                        {game.home_score} - {game.away_score}
                                                    </p>
                                                </div>

                                                {/* Slop + Watchability */}
                                                <div className="
                                                    sm:flex
                                                    hidden
                                                    justify-center
                                                    shrink-0 
                                                    text-center 
                                                    w-auto
                                                ">

                                                    <div className="mt-2 flex gap-4">
                                                        <div>
                                                            <p className="text-xs">
                                                                Slop
                                                            </p>

                                                            <p
                                                                className="text-lg font-semibold"
                                                                style={{
                                                                    color: game.slop_percentile !== null
                                                                        ? getHeatColour(game.slop_percentile)
                                                                        : undefined,
                                                                }}
                                                            >
                                                                {game.slop_percentile !== null
                                                                    ? `${(game.slop_percentile * 100).toFixed(1)}%`
                                                                    : "—"}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-xs">
                                                                Watchability
                                                            </p>

                                                            <p
                                                                className="text-lg font-semibold"
                                                                style={{
                                                                    color: game.watchability_percentile !== null
                                                                        ? getHeatColour(1 - game.watchability_percentile)
                                                                        : undefined,
                                                                }}
                                                            >
                                                                {game.watchability_percentile !== null
                                                                    ? `${(game.watchability_percentile * 100).toFixed(1)}%`
                                                                    : "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* UPCOMING GAMES */}
                        <section className="mt-8">
                            <h2 className="mb-4 text-xl font-semibold">
                                Upcoming Games
                            </h2>

                            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
                                {upcomingGames && upcomingGames.length > 0 ? (
                                    upcomingGames.slice(0, upcomingGamesCount).map((game) => {

                                        const slop = game.slop_percentile;
                                        const watchability = game.watchability_percentile;

                                        const badge = getGameBadge(game);


                                        const isHome = game.home_full_name === team.team.full_name;
                                        const opponent = isHome
                                            ? game.away_name
                                            : game.home_name;
                                        
                                        return (

                                            <Link
                                                href={`/${league}/preview/${game.game_id}?date=${getLocalDate(game.date)}`}
                                                target="_blank"
                                                key={game.game_id}
                                                className="
                                                    flex 
                                                    [&>div]:max-w-[50%] 
                                                    items-center 
                                                    justify-between 
                                                    p-5 
                                                    border-b 
                                                    border-zinc-800 
                                                    last:border-b-0 
                                                    no-underline!
                                                    transition
                                                    hover:bg-zinc-800/50
                                                "
                                            >

                                                {/* Game Info */}
                                                <div className="flex flex-col gap-1">
                                                    {badge && (
                                                        <Badge
                                                            title={badge.title}
                                                            x={3}
                                                            y={1}
                                                            colour={badge.colour}
                                                            className="w-fit mb-1"
                                                        />
                                                    )}

                                                    <p className="text-sm">
                                                        {new Date(game.date).toLocaleDateString()}
                                                    </p>

                                                    <h1 className="font-medium">
                                                        <span className="font-bold">
                                                            {team.team.name}
                                                        </span>
                                                        {isHome ? " vs " : " @ "}
                                                        {opponent}
                                                    </h1>

                                                    <p className="text-sm">
                                                        {game.venue_full_name}
                                                    </p>
                                                </div>
                                                
                                                {/* Predictions */}
                                                <div className="ml-4 shrink-0 text-center">
                                                    <div className="flex gap-4">
                                                        <div>
                                                            <p className="text-xs">
                                                                Slop
                                                            </p>

                                                            <p
                                                                className="text-lg font-semibold"
                                                                style={{
                                                                    color: game.slop_percentile !== null
                                                                        ? getHeatColour(game.slop_percentile)
                                                                        : undefined,
                                                                }}
                                                            >
                                                                {game.slop_percentile !== null
                                                                    ? `${(game.slop_percentile * 100).toFixed(1)}%`
                                                                    : "—"}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-xs">
                                                                Watchability
                                                            </p>

                                                            <p
                                                                className="text-lg font-semibold"
                                                                style={{
                                                                    color: game.watchability_percentile !== null
                                                                        ? getHeatColour(1 - game.watchability_percentile)
                                                                        : undefined,
                                                                }}
                                                            >
                                                                {game.watchability_percentile !== null
                                                                    ? `${(game.watchability_percentile * 100).toFixed(1)}%`
                                                                    : "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        )
                                    })
                                ) : (
                                    <div className="p-6 text-zinc-500">
                                        No upcoming games.
                                    </div>
                                )}
                            </div>

                            {upcomingGamesCount < team.upcoming_games.length && (
                                <ShowMoreButton
                                    currentCount={upcomingGamesCount}
                                    totalCount={team.upcoming_games.length}
                                    onShowMore={() => setUpcomingGamesCount((count) => count + 3)}
                                />
                            )}
                        </section>

                        {/* RECENT GAMES */}
                        <section className="mt-8">
                            <h2 className="mb-4 text-xl font-semibold">
                                Recent Games
                            </h2>

                            <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900">
                                {team.recent_games.length > 0 ? (
                                    team.recent_games.slice(0, recentGamesCount).map((game) => {

                                        const slop = game.slop_percentile;
                                        const watchability = game.watchability_percentile;

                                        const badge = getGameBadge(game);

                                        const isHome = game.home_full_name === team.team.full_name;
                                        const opponent = isHome
                                            ? game.away_name
                                            : game.home_name;

                                        const teamScore = isHome
                                            ? game.home_score
                                            : game.away_score;

                                        const opponentScore = isHome
                                            ? game.away_score
                                            : game.home_score;

                                        if (teamScore === null || opponentScore === null) {
                                            return null;
                                        }

                                        const won = teamScore > opponentScore; 
                                        const tie = teamScore === opponentScore;

                                        return (
                                            <Link
                                                href={`/${league}/preview/${game.game_id}?date=${getLocalDate(game.date)}`}
                                                target="_blank"
                                                key={game.game_id}
                                                className="
                                                    flex 
                                                    [&>div]:max-w-[50%] 
                                                    items-center 
                                                    justify-between 
                                                    p-5 
                                                    border-b 
                                                    border-zinc-800 
                                                    last:border-b-0 
                                                    no-underline!
                                                    transition
                                                    hover:bg-zinc-800/50
                                                "
                                            >
                                                <div className="flex flex-col gap-1">
                                                    {badge && (
                                                        <Badge
                                                            title={badge.title}
                                                            x={3}
                                                            y={1}
                                                            colour={badge.colour}
                                                            className="w-fit mb-1"
                                                        />
                                                    )}

                                                    <p className="text-sm">
                                                        {new Date(game.date).toLocaleDateString()}
                                                    </p>

                                                    <h1 className="font-medium">
                                                        <span className="font-bold">
                                                            {team.team.name}
                                                        </span>
                                                        {isHome ? " vs " : " @ "}
                                                        {opponent}
                                                    </h1>

                                                    <p className="text-sm">
                                                        {game.venue_full_name}
                                                    </p>
                                                </div>

                                                <div className="flex flex-col items-end gap-2">

                                                    <p className="flex gap-2 text-2xl font-semibold">
                                                        <span
                                                            className={
                                                                tie 
                                                                ? "text-yellow-500" 
                                                                : won
                                                                    ? "text-green-500"
                                                                    : "text-red-500"
                                                            }
                                                        >
                                                            {won ? "W" : tie ? "T" : "L"}
                                                        </span>
                                                        <span className="text-white">
                                                            {teamScore} - {opponentScore}
                                                        </span>
                                                    </p>
                                                    
                                                    {/* Predictions */}
                                                    <div className="ml-4 shrink-0 text-center">
                                                        <div className="flex gap-4">
                                                            <div>
                                                                <p className="text-xs">
                                                                    Slop
                                                                </p>

                                                                <p
                                                                    className="text-lg font-semibold"
                                                                    style={{
                                                                        color: game.slop_percentile !== null
                                                                            ? getHeatColour(game.slop_percentile)
                                                                            : undefined,
                                                                    }}
                                                                >
                                                                    {game.slop_percentile !== null
                                                                        ? `${(game.slop_percentile * 100).toFixed(1)}%`
                                                                        : "—"}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs">
                                                                    Watchability
                                                                </p>

                                                                <p
                                                                    className="text-lg font-semibold"
                                                                    style={{
                                                                        color: game.watchability_percentile !== null
                                                                            ? getHeatColour(1 - game.watchability_percentile)
                                                                            : undefined,
                                                                    }}
                                                                >
                                                                    {game.watchability_percentile !== null
                                                                        ? `${(game.watchability_percentile * 100).toFixed(1)}%`
                                                                        : "—"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <div className="p-6 text-zinc-500">
                                        No recent games.
                                    </div>
                                )}
                            </div>
                            {recentGamesCount < team.recent_games.length && (
                                <ShowMoreButton
                                    currentCount={recentGamesCount}
                                    totalCount={team.recent_games.length}
                                    onShowMore={() => setRecentGamesCount((count) => count + 3)}
                                />
                            )}
                        </section>
                    </>
                ) : (
                    <div className="
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
                                Unable to Load Team
                            </h1>

                            <p className="
                                mt-3 
                                text-sm 
                                leading-relaxed 
                                text-gray-400
                            ">
                                {error ?? "We couldn't load this team. It may be unavailable or no longer exist."}
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
                    </div>
                )}


            </div>
        </div>
    );
}