"use client";

interface SportTeamsProps {
    leagues: string[];
}

export default function SportTeams({ leagues }: SportTeamsProps) {
    return (
        <section className="space-y-6">
            <h2 className="text-2xl font-bold">Teams</h2>

            {leagues.map((league) => (
                <div key={league}>
                    <h3 className="text-xl font-semibold">{league}</h3>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <div
                                key={index}
                                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
                            >
                                {league} Team {index + 1}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </section>
    );
}