export default function PreviewSkeleton() {
    return (
        <div className="py-3">
            <div className="mx-auto max-w-5xl">

                {/* BACK */}
                <div className="mb-4 h-5 w-40 rounded bg-zinc-800 skeleton-glow" />

                {/* HEADER */}
                <div className="text-center">

                    {/* LEAGUE */}
                    <div className="mx-auto h-4 w-16 rounded bg-zinc-800 skeleton-glow" />

                    {/* DATE */}
                    <div className="mx-auto mt-3 h-4 w-48 rounded bg-zinc-800 skeleton-glow" />

                    {/* TEAMS */}
                    <div className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-3 items-center gap-6 sm:gap-12">

                        <div className="space-y-2">
                            <div className="mx-auto h-4 w-12 rounded bg-zinc-800 skeleton-glow" />
                            <div className="mx-auto h-10 w-32 rounded bg-zinc-800 skeleton-glow sm:w-40" />
                        </div>

                        <div className="mx-auto h-12 w-20 rounded bg-zinc-800 skeleton-glow" />

                        <div className="space-y-2">
                            <div className="mx-auto h-4 w-12 rounded bg-zinc-800 skeleton-glow" />
                            <div className="mx-auto h-10 w-32 rounded bg-zinc-800 skeleton-glow sm:w-40" />
                        </div>

                    </div>

                    {/* VENUE */}
                    <div className="mx-auto mt-4 h-4 w-40 rounded bg-zinc-800 skeleton-glow" />

                    {/* BADGE */}
                    <div className="mx-auto mt-5 h-8 w-32 rounded-full bg-zinc-800 skeleton-glow" />
                </div>

                {/* PREDICTION */}
                <section className="mt-8">
                    <div className="mb-4 h-7 w-40 rounded bg-zinc-800 skeleton-glow" />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                            <div className="mx-auto h-3 w-12 rounded bg-zinc-800 skeleton-glow" />
                            <div className="mx-auto mt-3 h-9 w-20 rounded bg-zinc-800 skeleton-glow" />
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                            <div className="mx-auto h-3 w-20 rounded bg-zinc-800 skeleton-glow" />
                            <div className="mx-auto mt-3 h-9 w-20 rounded bg-zinc-800 skeleton-glow" />
                        </div>
                    </div>
                </section>

                {/* TEAM COMPARISON */}
                <section className="mt-8">
                    <div className="mb-4 h-7 w-48 rounded bg-zinc-800 skeleton-glow" />

                    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                        {[1, 2, 3, 4, 5].map((row) => (
                            <div
                                key={row}
                                className={`
                                    grid grid-cols-3 items-center p-5
                                    ${row !== 5 ? "border-b border-zinc-800" : ""}
                                `}
                            >
                                <div className="h-5 w-24 rounded bg-zinc-800 skeleton-glow" />
                                <div className="mx-auto h-3 w-16 rounded bg-zinc-800 skeleton-glow" />
                                <div className="ml-auto h-5 w-24 rounded bg-zinc-800 skeleton-glow" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* RECENT FORM */}
                <section className="mt-8">
                    <div className="mb-4 h-7 w-36 rounded bg-zinc-800 skeleton-glow" />

                    <div className="grid gap-4 sm:grid-cols-2">
                        {[1, 2].map((card) => (
                            <div
                                key={card}
                                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
                            >
                                <div className="h-5 w-32 rounded bg-zinc-800 skeleton-glow" />

                                <div className="mt-4">
                                    {[1, 2, 3, 4, 5].map((game) => (
                                        <div
                                            key={game}
                                            className={`
                                                flex
                                                items-center
                                                justify-between
                                                p-3
                                                ${game !== 5
                                                    ? "border-b border-zinc-800"
                                                    : ""}
                                            `}
                                        >
                                            <div className="space-y-2">
                                                <div className="h-4 w-24 rounded bg-zinc-800 skeleton-glow" />
                                                <div className="h-3 w-20 rounded bg-zinc-800 skeleton-glow" />
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="space-y-1 text-center">
                                                    <div className="mx-auto h-2 w-8 rounded bg-zinc-800 skeleton-glow" />
                                                    <div className="mx-auto h-4 w-8 rounded bg-zinc-800 skeleton-glow" />
                                                </div>

                                                <div className="space-y-1 text-center">
                                                    <div className="mx-auto h-2 w-14 rounded bg-zinc-800 skeleton-glow" />
                                                    <div className="mx-auto h-4 w-8 rounded bg-zinc-800 skeleton-glow" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
}