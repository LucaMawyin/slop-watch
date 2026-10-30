
export default function HomeSkeleton() {
    return (
        <div className="mx-auto w-full max-w-7xl space-y-10">

            {/* Stats */}
            <section className="space-y-4">
                <div className="h-8 w-64 rounded-lg bg-zinc-800 skeleton-glow" />

                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                            <div className="h-4 w-28 rounded bg-zinc-800 skeleton-glow" />
                            <div className="mt-4 h-10 w-20 rounded bg-zinc-800 skeleton-glow" />
                            <div className="mt-3 h-3 w-36 max-w-full rounded bg-zinc-800 skeleton-glow" />
                        </div>
                    ))}
                </div>
            </section>

            {/* Today's Slop */}
            <section className="space-y-5">
                <div className="h-8 w-40 rounded-lg bg-zinc-800 skeleton-glow" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <GameCardSkeleton key={i} />
                    ))}
                </div>
            </section>

            {/* Upcoming Games */}
            <section className="space-y-5">
                <div className="h-8 w-48 rounded-lg bg-zinc-800 skeleton-glow" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <GameCardSkeleton key={i} />
                    ))}
                </div>
            </section>

            {/* Browse Leagues */}
            <section className="space-y-6">
                <div className="space-y-3">
                    <div className="h-3 w-20 rounded bg-zinc-800 skeleton-glow" />
                    <div className="h-8 w-56 rounded-lg bg-zinc-800 skeleton-glow" />
                    <div className="h-4 w-64 rounded bg-zinc-800 skeleton-glow" />
                </div>

                {[4, 2, 2, 2, 4].map((count, groupIndex) => (
                    <div key={groupIndex} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-24 rounded bg-zinc-800 skeleton-glow" />
                            <div className="h-px flex-1 bg-zinc-800 skeleton-glow" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {Array.from({ length: count }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex min-h-24 items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                                >
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="h-4 w-20 max-w-full rounded bg-zinc-800 skeleton-glow" />
                                        <div className="h-3 w-16 rounded bg-zinc-800 skeleton-glow" />
                                    </div>
                                    <div className="h-5 w-3 rounded bg-zinc-800 skeleton-glow" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}

function GameCardSkeleton() {
    return (
        <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between pb-3">
                <div className="h-4 w-32 rounded bg-zinc-800 skeleton-glow" />
                <div className="h-6 w-20 rounded-full bg-zinc-800 skeleton-glow" />
            </div>

            <div className="mb-4 h-5 w-16 rounded bg-zinc-800 skeleton-glow" />

            <div className="flex justify-between gap-4">
                <div className="w-2/5 space-y-2">
                    <div className="h-3 w-10 rounded bg-zinc-800 skeleton-glow" />
                    <div className="h-6 w-full rounded bg-zinc-800 skeleton-glow" />
                </div>

                <div className="w-2/5 space-y-2">
                    <div className="ml-auto h-3 w-10 rounded bg-zinc-800 skeleton-glow" />
                    <div className="ml-auto h-6 w-full rounded bg-zinc-800 skeleton-glow" />
                </div>
            </div>

            <div className="my-5 flex justify-center">
                <div className="h-4 w-40 rounded bg-zinc-800 skeleton-glow" />
            </div>

            <div className="mb-6 flex justify-evenly border-t border-zinc-800 pt-4">
                {[0, 1].map((i) => (
                    <div key={i} className="space-y-3 text-center">
                        <div className="mx-auto h-3 w-24 rounded bg-zinc-800 skeleton-glow" />
                        <div className="h-24 w-24 rounded-full border-8 border-zinc-800 skeleton-glow" />
                    </div>
                ))}
            </div>

            <div className="mt-auto space-y-4">
                <div className="h-10 w-full rounded-lg bg-zinc-800 skeleton-glow" />
                <div className="h-10 w-full rounded-lg bg-zinc-800 skeleton-glow" />
            </div>
        </div>
    );
}
