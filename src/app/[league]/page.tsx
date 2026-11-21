"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { leagues } from "@/lib/leagues";
import SportHeader from "@/components/sport/SportHeader";
import SportTeams from "@/components/sport/SportTeams";
import UpcomingGames from "@/components/UpcomingGames";
import { Game } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import LiveGames from "@/components/sport/LiveGames";

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

    const gamesRef = useRef<Game[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        gamesRef.current = games;
    }, [games]);
    

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        let currentVersion: string | null = null;
        let initialLoad = true;

        const loadGames = async () => {
            try {
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

                // Nothing changed, don't download games again
                if (currentVersion === String(version)) return;

                const today = new Date();
                const end = new Date(today);

                end.setDate(today.getDate() + 1);

                const formatDate = (date: Date) =>
                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

                const params = new URLSearchParams({
                    start: formatDate(today),
                    end: formatDate(end),
                    version: String(version),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                });

                if (league) {
                    params.set("league", league.id);
                } else {
                    params.set("sport", category);
                }

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/games?${params}`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to load games.");
                }

                const data: Game[] = await response.json();

                if (controller.signal.aborted) return;

                if (!Array.isArray(data)) {
                    throw new Error("Expected games array.");
                }

                currentVersion = String(version);

                setGames(data);

                // Fetch initial live scores in the background
                const currentTime = Date.now();

                const liveGames = data
                    .filter((game) => {
                        const age = currentTime - new Date(game.date).getTime();

                        return (
                            age >= -30 * 60 * 1000 &&
                            age <= 6 * 60 * 60 * 1000
                        );
                    })
                    .sort(
                        (a, b) =>
                            (b.slop_percentile ?? 0) -
                            (a.slop_percentile ?? 0)
                    )
                    .slice(0, 3);

                Promise.allSettled(
                    liveGames.map(async (game) => {
                        const params = new URLSearchParams({
                            league: game.league,
                            date: game.date,
                        });

                        const response = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/game/${game.game_id}/score?${params}`,
                            {
                                cache: "no-store",
                                signal: controller.signal,
                            }
                        );

                        if (!response.ok) {
                            throw new Error(
                                `Failed to fetch score for ${game.game_id}`
                            );
                        }

                        const updatedGame: Partial<Game> = await response.json();

                        return { game, updatedGame };
                    })
                ).then((results) => {
                    if (controller.signal.aborted) return;

                    setGames((current) =>
                        current.map((game) => {
                            const result = results.find(
                                (item) =>
                                    item.status === "fulfilled" &&
                                    item.value.game.game_id === game.game_id &&
                                    item.value.game.league === game.league
                            );

                            if (result?.status !== "fulfilled") return game;

                            return {
                                ...game,
                                ...Object.fromEntries(
                                    Object.entries(result.value.updatedGame).map(
                                        ([key, value]) => [
                                            key,
                                            value ?? game[key as keyof Game],
                                        ]
                                    )
                                ),
                            };
                        })
                    );
                });

            } catch (err) {
                if (
                    err instanceof Error &&
                    err.name === "AbortError"
                ) {
                    return;
                }

                console.error("Failed to load games:", err);
            } finally {
                if (initialLoad && !controller.signal.aborted) {
                    initialLoad = false;
                    setLoading(false);
                }
            }
        };

        loadGames();

        const interval = setInterval(loadGames, 5 * 60 * 1000);

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [category, league]);

    useEffect(() => {
        if (loading || games.length === 0) return;

        const controller = new AbortController();

        let updating = false;

        const updateLiveGames = async () => {
            if (updating) return;

            updating = true;

            try {
                const currentTime = Date.now();

                const liveGames = gamesRef.current
                    .filter((game) => {
                        const age =
                            currentTime - new Date(game.date).getTime();

                        return (
                            age >= -30 * 60 * 1000 &&
                            age <= 6 * 60 * 60 * 1000
                        );
                    })
                    .sort(
                        (a, b) =>
                            (b.slop_percentile ?? 0) -
                            (a.slop_percentile ?? 0)
                    )
                    .slice(0, 3);

                const results = await Promise.allSettled(
                    liveGames.map(async (game) => {
                        const params = new URLSearchParams({
                            league: game.league,
                            date: game.date,
                        });

                        const response = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/game/${game.game_id}/score?${params}`,
                            {
                                cache: "no-store",
                                signal: controller.signal,
                            }
                        );

                        if (!response.ok) {
                            throw new Error(
                                `Failed to fetch score for ${game.game_id}`
                            );
                        }

                        const updatedGame: Partial<Game> =
                            await response.json();

                        return { game, updatedGame };
                    })
                );

                if (controller.signal.aborted) return;

                setGames((current) =>
                    current.map((game) => {
                        const result = results.find(
                            (item) =>
                                item.status === "fulfilled" &&
                                item.value.game.game_id === game.game_id &&
                                item.value.game.league === game.league
                        );

                        if (result?.status !== "fulfilled") return game;

                        return {
                            ...game,
                            ...Object.fromEntries(
                                Object.entries(result.value.updatedGame).map(
                                    ([key, value]) => [
                                        key,
                                        value ?? game[key as keyof Game],
                                    ]
                                )
                            ),
                        };
                    })
                );

            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name !== "AbortError"
                ) {
                    console.error("Failed to update live scores:", error);
                }
            } finally {
                updating = false;
            }
        };

        updateLiveGames();

        const interval = setInterval(updateLiveGames, 60 * 1000);

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [games.length, loading]);

    useEffect(() => {
        const controller = new AbortController();
        let isFetching = false;

        async function fetchLiveScores() {
            if (isFetching) return;

            isFetching = true;

            try {
                const currentGames = gamesRef.current;
                const now = Date.now();

                const liveCandidates = currentGames.filter((game) => {
                    const gameTime = new Date(game.date).getTime();

                    return (
                        game.actual_slop === null &&
                        gameTime >= now - 30 * 60 * 1000 &&
                        gameTime <= now + 6 * 60 * 60 * 1000
                    );
                });

                const updates = await Promise.all(
                    liveCandidates.map(async (game) => {
                        const date = new Date(game.date)
                            .toISOString()
                            .split("T")[0];

                        const params = new URLSearchParams({
                            league: game.league,
                            date,
                        });

                        const response = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/game/${game.game_id}/score?${params}`,
                            { signal: controller.signal }
                        );

                        if (!response.ok) return null;

                        const data: Partial<Game> = await response.json();

                        return {
                            game_id: game.game_id,
                            league: game.league,
                            data,
                        };
                    })
                );

                setGames((previous) =>
                    previous.map((game) => {
                        const update = updates.find(
                            (item) =>
                                item?.game_id === game.game_id &&
                                item?.league === game.league
                        );

                        return update
                            ? { ...game, ...update.data }
                            : game;
                    })
                );
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name !== "AbortError"
                ) {
                    console.error("Failed to fetch live scores:", error);
                }
            } finally {
                isFetching = false;
            }
        }

        fetchLiveScores();

        const interval = setInterval(fetchLiveScores, 60_000);

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, []);

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
                <LiveGames
                    games={games}
                    now={now}
                    name={name}
                    category={category!}
                    loading={loading}
                />
                <UpcomingGames
                    games={games}
                    now={now}
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

            <SportTeams
                leagues={selectedLeagues}
            />

        </main>
    );
}