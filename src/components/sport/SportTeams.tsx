"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { slugify } from "@/lib/slugify";
import TeamLogo from "@/components/TeamLogo";
import { leagues as leagueConfig } from "@/lib/leagues";
import { useParams } from "next/navigation";

interface SportTeamsProps {
    leagues: string[];
}

interface Team {
    name: string;
    full_name: string;
    id: string | number;
    league: string;
}

const getVisibleCount = (grid: HTMLDivElement) => {
    const columns = getComputedStyle(grid)
        .gridTemplateColumns
        .split(" ").length;

    return columns * 2;
};

export default function SportTeams({
    leagues,
}: SportTeamsProps) {

    const params = useParams<{ league: string }>();

    const isSportPage = !leagueConfig.some(
        (item) => item.id === params.league
    );

    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    const leagueKey = leagues.join(",");

    useEffect(() => {
        const controller = new AbortController();

        async function fetchTeams() {
            setLoading(true);

            try {
                const results = await Promise.allSettled(
                    leagueKey.split(",").map(async (league) => {
                        const response = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/teams?league=${encodeURIComponent(league)}`,
                            { signal: controller.signal }
                        );

                        if (!response.ok) {
                            throw new Error(`Failed to fetch ${league} teams`);
                        }

                        const data: Omit<Team, "league">[] =
                            await response.json();

                        return data.map((team) => ({
                            ...team,
                            league,
                        }));
                    })
                );

                if (controller.signal.aborted) return;

                const fetchedTeams = results.flatMap((result) =>
                    result.status === "fulfilled" ? result.value : []
                );

                setTeams(fetchedTeams);
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name !== "AbortError"
                ) {
                    console.error(error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        if (leagueKey) {
            fetchTeams();
        } else {
            setTeams([]);
            setLoading(false);
        }

        return () => controller.abort();
    }, [leagueKey]);

    const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

    const groupedTeams = leagues.map((league) => {
        const leagueTeams = teams.filter((team) => team.league === league);

        return {
            league,
            teams: leagueTeams.slice(0, visibleCounts[league] ?? 0),
            total: leagueTeams.length,
        };
    });

    useEffect(() => {
        if (loading) return;

        const grids = document.querySelectorAll<HTMLDivElement>(
            "[data-team-grid]"
        );

        const observers: ResizeObserver[] = [];

        grids.forEach((grid) => {
            const league = grid.dataset.teamGrid;
            if (!league) return;

            let previousWidth = 0;

            const updateVisibleCount = () => {
                const width = grid.clientWidth;

                if (width === previousWidth) return;

                previousWidth = width;

                setVisibleCounts((prev) => ({
                    ...prev,
                    [league]: Math.max(
                        prev[league] ?? 0,
                        getVisibleCount(grid)
                    ),
                }));
            };

            updateVisibleCount();

            const observer = new ResizeObserver(updateVisibleCount);
            observer.observe(grid);

            observers.push(observer);
        });

        return () => observers.forEach((observer) => observer.disconnect());
    }, [loading, leagueKey]);

    return (
        <section className="space-y-6">
            <h2 className="text-2xl font-bold">Teams</h2>

            {loading ? (
                <div className="
                    grid
                    grid-cols-2
                    gap-4
                    sm:grid-cols-3
                    lg:grid-cols-4
                    3xl:grid-cols-6
                    5xl:grid-cols-8
                ">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div
                            key={index}
                            className="
                                flex
                                flex-col
                                items-center
                                justify-center
                                gap-3
                                rounded-xl
                                border
                                border-zinc-800
                                bg-zinc-900
                                p-5
                            "
                        >
                            <div className="h-16 w-16 rounded-full bg-zinc-800 sm:h-20 sm:w-20 skeleton-glow"/>

                            <div className="h-4 w-3/4 rounded-md bg-zinc-800 skeleton-glow"/>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="space-y-10">
                        {groupedTeams.map(({ league, teams: leagueTeams, total }) => (
                            <div key={league} className="space-y-4">
                                <div className="flex flex-row items-center justify-between">
                                    <h3 className="text-xl font-semibold">
                                        {leagueConfig.find((item) => item.id === league)?.name ?? league}
                                    </h3>
                                    {isSportPage && (
                                        <Link
                                            className="shrink-0 text-sm font-medium transition"
                                            href={`${league}`}
                                        >
                                            View {leagueConfig.find((item) => item.id === league)?.name ?? league} →
                                        </Link>
                                    )}
                                </div>


                                <div
                                    data-team-grid={league}
                                    className="
                                        grid
                                        grid-cols-2
                                        gap-4
                                        sm:grid-cols-3
                                        lg:grid-cols-4
                                        3xl:grid-cols-6
                                        5xl:grid-cols-8
                                    "
                                >
                                    {leagueTeams.map((team) => (
                                        <Link
                                            key={`${team.league}-${team.id}`}
                                            href={`/${team.league}/teams/${slugify(team.name)}?id=${team.id}`}
                                            target="_blank"
                                            className="
                                                flex
                                                flex-col
                                                items-center
                                                justify-center
                                                gap-3
                                                rounded-xl
                                                border
                                                border-zinc-800
                                                bg-zinc-900
                                                p-5
                                                text-center
                                                transition
                                                hover:border-zinc-700
                                                hover:bg-zinc-800
                                            "
                                        >
                                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800">
                                                {team.name}
                                            </div>

                                            <span className="font-medium text-zinc-200">
                                                {team.full_name}
                                            </span>
                                        </Link>
                                    ))}
                                </div>

                                {total > (visibleCounts[league] ?? 0) && (
                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => {
                                                const grid = document.querySelector<HTMLDivElement>(
                                                    `[data-team-grid="${league}"]`
                                                );

                                                if (!grid) return;

                                                setVisibleCounts((prev) => ({
                                                    ...prev,
                                                    [league]: Math.min(
                                                        (prev[league] ?? 0) + getVisibleCount(grid) * 2,
                                                        total
                                                    ),
                                                }));
                                            }}
                                            className="
                                                rounded-lg
                                                border
                                                border-zinc-700
                                                bg-zinc-900
                                                px-6
                                                py-2
                                                text-sm
                                                font-medium
                                                text-zinc-200
                                                transition
                                                hover:bg-zinc-800
                                            "
                                        >
                                            Show More
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>

            )}
        </section>
    );
}