"use client";

import Badge from "@/components/Badge";
import ShowMoreButton from "@/components/ShowMoreButton";
import TeamSkeleton from "@/components/TeamSkeleton";
import { getHeatColour } from "@/lib/getHeatColour";
import { getSlopBadge } from "@/lib/getSlopBadge";
import { slugify, unslugify } from "@/lib/slugify";
import { Team } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

type Props = {
    params: Promise<{
        league: string;
        team: string;
    }>;
};

export default function TeamPage({ params }: Props) {
    const { league, team: teamSlug } = use(params);

    const router = useRouter();

    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentGamesCount, setRecentGamesCount] = useState(3);
    const [ upcomingGamesCount, setUpcomingGamesCount ] = useState(3);

    const slug = slugify(teamSlug);

    const displayTeamName = team?.team ?? unslugify(teamSlug);

    useEffect(() => {
        if (teamSlug !== slug) {
            router.replace(`/${league}/${slug}`);
            return;
        }

        async function fetchTeam() {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/team/${league}/${slug}`
                );

                if (!response.ok) {
                    throw new Error(
                        `Team API failed: ${response.status}`
                    );
                }

                const data = await response.json() as Team;

                setTeam(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        fetchTeam();
    }, [league, slug, teamSlug, router]);


    return (
        <div className="w-full p-6 text-white">
            <div className="mx-auto max-w-5xl">

                {/* PAGE HEADER */}
                <div className="mb-8">

                    <Link
                        href={`/games?league=${league}`}
                        className="mb-4 block hover:underline"
                    >
                        &lt; Back to {league.toUpperCase()} Games
                    </Link>

                    <div className="text-sm uppercase text-zinc-500">
                        {league}
                    </div>

                    <h1 className="mt-1 text-4xl font-bold">
                        {displayTeamName}
                    </h1>
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

                        {/* UPCOMING GAMES */}
                        <section className="mt-8">
                            <h2 className="mb-4 text-xl font-semibold">
                                Upcoming Games
                            </h2>

                            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
                                {team.upcoming_games.length > 0 ? (
                                    team.upcoming_games.slice(0, upcomingGamesCount).map((game) => {

                                        const isHome = game.home_name === team.team;
                                        const opponent = isHome ? game.away_name : game.home_name;
                                        
                                        return (

                                            <Link
                                                href={`/${league}/preview/${game.game_id}?date=${game.date.slice(0, 10)}`}
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
                                                <div>
                                                    <p className="text-sm">
                                                        {new Date(game.date).toLocaleDateString()}
                                                    </p>

                                                    <p className="mt-1 font-medium text-white!">
                                                        <span className="font-bold">
                                                            {team.team}
                                                        </span>
                                                        {isHome ? " vs " : " @ "}
                                                        {opponent}
                                                    </p>

                                                    <p className="mt-1 text-sm">
                                                        {game.venue_full_name}
                                                    </p>
                                                </div>
                                                
                                                {/* Predictions */}
                                                <div className="ml-4 shrink-0 text-center">
                                                    <div className="flex gap-4">
                                                        <div>
                                                            <p className="text-xs text-zinc-500">
                                                                Slop
                                                            </p>

                                                            <p
                                                                className="text-lg font-semibold"
                                                                style={{
                                                                    color: getHeatColour(game.slop_percentile),
                                                                }}
                                                            >
                                                                {(game.slop_percentile * 100).toFixed(1)}%
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-xs text-zinc-500">
                                                                Watchability
                                                            </p>

                                                            <p
                                                                className="text-lg font-semibold"
                                                                style={{
                                                                    color: getHeatColour(1 - game.watchability_percentile),
                                                                }}
                                                            >
                                                                {(game.watchability_percentile * 100).toFixed(1)}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        )
                                    })
                                ) : (
                                    <div className="p-6">
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
                                        const slopColour = getHeatColour(slop);

                                        const watchability = game.watchability_percentile;
                                        const watchabilityColour = getHeatColour(1-watchability);

                                        const badge = getSlopBadge(slop, watchability);

                                        const isHome = game.home_name === team.team;
                                        const opponent = isHome ? game.away_name : game.home_name;

                                        const teamScore = isHome
                                            ? game.home_score
                                            : game.away_score;

                                        const opponentScore = isHome
                                            ? game.away_score
                                            : game.home_score;

                                        const won = teamScore > opponentScore; 
                                        const tie = teamScore === opponentScore;

                                        return (
                                            <Link
                                                href={`/${league}/preview/${game.game_id}?date=${game.date.slice(0, 10)}`}
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
                                                    <Badge
                                                        title={badge.title}
                                                        x={3}
                                                        y={1}
                                                        colour={badge.colour}
                                                        className="w-fit mb-1"
                                                    />

                                                    <p className="text-sm">
                                                        {new Date(game.date).toLocaleDateString()}
                                                    </p>

                                                    <p className="font-medium text-white!">
                                                        <span className="font-bold">
                                                            {team.team}
                                                        </span>
                                                        {isHome ? " vs " : " @ "}
                                                        {opponent}
                                                    </p>

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
                                                                <p className="text-xs text-zinc-500">
                                                                    Slop
                                                                </p>

                                                                <p
                                                                    className="text-lg font-semibold"
                                                                    style={{
                                                                        color: getHeatColour(game.slop_percentile),
                                                                    }}
                                                                >
                                                                    {(game.slop_percentile * 100).toFixed(1)}%
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-zinc-500">
                                                                    Watchability
                                                                </p>

                                                                <p
                                                                    className="text-lg font-semibold"
                                                                    style={{
                                                                        color: getHeatColour(1 - game.watchability_percentile),
                                                                    }}
                                                                >
                                                                    {(game.watchability_percentile * 100).toFixed(1)}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <div className="p-6">
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
                    <div className="text-red-400">
                        Failed to load team.
                    </div>
                )}


            </div>
        </div>
    );
}