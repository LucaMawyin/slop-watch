"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { leagues } from "@/lib/leagues";
import SportHeader from "@/components/sport/SportHeader";
import SportTeams from "@/components/sport/SportTeams";
import UpcomingGames from "@/components/UpcomingGames";
import { Game } from "@/lib/types";
import { useEffect, useState } from "react";

export default function SportPage() {

    const router = useRouter();

    const params = useParams<{ league: string }>();
    const category = params.league?.toLowerCase();

    const league = leagues.find(
        (item) => item.id === category
    );

    const sport = league
        ? null
        : [...new Set(leagues.map((item) => item.sport.toLowerCase()))]
            .find((item) => item === category)
            ?.replace(/^./, (char) => char.toUpperCase());

    const isValidLeague = !!league;
    const isValidSport = leagues.some(
        (item) => item.sport.toLowerCase() === category
    );

    const selectedLeagues = league
        ? [league.id]
        : leagues
            .filter(
                (item) => item.sport.toLowerCase() === sport?.toLowerCase()
            )
            .map((item) => item.id);

    const name = league?.name ?? sport ?? "Sports";

    const description = league
        ? `${league.sport}`
        : `${name} games, teams, and statistics`;

    const sportName = league?.sport ?? category;
    const image = `/images/${sportName?.toLowerCase()}.webp`;

    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        let currentVersion: string | null = null;

        async function fetchGames() {
            try {
                const versionResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/version`,
                    { signal: controller.signal }
                );

                if (!versionResponse.ok) {
                    throw new Error("Failed to fetch API version");
                }

                const { version } = await versionResponse.json() as any;

                // Nothing changed so dont download the games again
                if (currentVersion === String(version)) return;

                const today = new Date();
                const end = new Date(today);

                end.setDate(today.getDate() + 7);

                const formatDate = (date: Date) =>
                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

                const params = new URLSearchParams({
                    start: formatDate(today),
                    end: formatDate(end),
                    version: String(version),
                });

                if (league) {
                    params.set("league", league.id);
                } else {
                    params.set("sport", category);
                }

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/games?${params}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error("Failed to load games.");
                }

                const data: Game[] = await response.json();

                setGames(data);
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

        fetchGames();

        return () => controller.abort();
    }, [category, league]);

    if (!isValidLeague && !isValidSport) {
        notFound();
    }

    return (
        <main className="space-y-10 p-6 text-white">

            <SportHeader
                name={name}
                description={description}
                image={image}
            />

            <div className="
                flex
                flex-col
                gap-6
                justify-center
                items-center

            ">
                <UpcomingGames
                    games={games}
                    category={category}
                    name={name}
                    loading={loading}
                />        
                <button
                    onClick={() => router.push(`${category ? `/${category}/games` : "/games"}`)}
                    className="
                        rounded-lg
                        border
                        border-zinc-800
                        bg-zinc-900
                        px-5
                        py-2.5
                        text-sm
                        font-medium
                        text-zinc-200
                        transition
                        hover:border-zinc-700
                        hover:bg-zinc-800
                        w-full
                        sm:w-fit
                    "
                >
                    Show All {name} Games
                </button>    
            </div>

            {/* <SportTeams leagues={selectedLeagues} /> */}

        </main>
    );
}