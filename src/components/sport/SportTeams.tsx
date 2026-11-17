
"use client";

import { slugify } from "@/lib/slugify";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SportTeamsProps {
    leagues: string[];
}

interface Team {
    name: string;
    full_name: string;
    id: string | number;
    league: string;
}

export default function SportTeams({ leagues }: SportTeamsProps) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    const leagueKey = leagues.join(",");

    useEffect(() => {
        const controller = new AbortController();

        async function fetchTeams() {
            setLoading(true);

            try {
                const results = await Promise.all(
                    leagues.map(async (league) => {
                        const response = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/teams?league=${encodeURIComponent(league)}`,
                            { signal: controller.signal }
                        );

                        if (!response.ok) {
                            throw new Error(`Failed to fetch ${league}`);
                        }

                        const data = await response.json();

                        if (!Array.isArray(data)) {
                            throw new Error(`Invalid team data for ${league}`);
                        }

                        return data.map((team) => ({
                            ...team,
                            league,
                        }));
                    })
                );

                if (!controller.signal.aborted) {
                    setTeams(results.flat());
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error("Team fetch failed:", error);
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

    return (
        <section className="space-y-6">
            <h2 className="text-2xl font-bold">Teams</h2>

            {loading ? (
                <p>Loading teams...</p>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {teams.map((team, index) => (
                        <Link
                            key={`${team.league}-${team.id}`}
                            href={`/${team.league}/teams/${slugify(team.name)}?id=${team.id}`}
                            target="_blank"
                            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-center"
                        >
                            {team.full_name}
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
