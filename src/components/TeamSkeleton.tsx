export default function TeamSkeleton() {
    return (
        <>
            <div className="mx-auto max-w-5xl">

                {/* TEAM STATS */}
                <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="
                                rounded-xl
                                border
                                border-zinc-800
                                bg-zinc-900
                                p-5
                            "
                        >
                            <div className="h-3 w-16 rounded bg-zinc-800 skeleton-glow" />

                            <div className="mt-3 h-8 w-24 rounded bg-zinc-800 skeleton-glow" />
                        </div>
                    ))}
                </section>

                {/* UPCOMING GAMES */}
                <section className="mt-8">
                    <div className="mb-4 h-6 w-40 rounded bg-zinc-800 skeleton-glow" />

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="
                                    flex
                                    items-center
                                    justify-between
                                    border-b
                                    border-zinc-800
                                    p-5
                                    last:border-b-0
                                "
                            >
                                {/* Game Info */}
                                <div className="max-w-[50%]">
                                    <div className="h-4 w-24 rounded bg-zinc-800 skeleton-glow" />

                                    <div className="mt-2 h-5 w-48 rounded bg-zinc-800 skeleton-glow" />

                                    <div className="mt-2 h-4 w-40 rounded bg-zinc-800 skeleton-glow" />
                                </div>

                                {/* Prediction */}
                                <div className="max-w-[50%] text-right">
                                    <div className="h-4 w-24 rounded bg-zinc-800 skeleton-glow" />

                                    <div className="mt-2 ml-auto h-7 w-16 rounded bg-zinc-800 skeleton-glow" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* RECENT GAMES */}
                <section className="mt-8">
                    <div className="mb-4 h-6 w-32 rounded bg-zinc-800 skeleton-glow" />

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="
                                    flex
                                    items-center
                                    justify-between
                                    border-b
                                    border-zinc-800
                                    p-5
                                    last:border-b-0
                                "
                            >
                                {/* Game Info */}
                                <div className="max-w-[50%]">
                                    <div className="h-4 w-24 rounded bg-zinc-800 skeleton-glow" />

                                    <div className="mt-2 h-5 w-48 rounded bg-zinc-800 skeleton-glow" />

                                    <div className="mt-2 h-4 w-40 rounded bg-zinc-800 skeleton-glow" />
                                </div>

                                {/* Score */}
                                <div className="max-w-[50%]">
                                    <div className="ml-auto h-7 w-24 rounded bg-zinc-800 skeleton-glow" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </>
    );
}