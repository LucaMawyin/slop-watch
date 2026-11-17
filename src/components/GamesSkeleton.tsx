type GamesSkeletonProps = {
    showLeague?: boolean;
    count?: number;
};

export default function GamesSkeleton({
    showLeague = false,
    count=9,
}: GamesSkeletonProps) {
    return (
        <div className="
            mt-8
            grid
            auto-rows-fr
            grid-cols-1
            gap-4
            sm:grid-cols-2
            lg:grid-cols-3
        ">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="
                        flex
                        flex-col

                        rounded-xl
                        border
                        border-zinc-800
                        bg-zinc-900
                        p-5
                        gap-6
                    "
                >
                    {/* Date + badge */}
                    <div className="flex items-center justify-between -mb-3">
                        <div className="h-5 w-32 rounded bg-zinc-800 skeleton-glow" />
                        <div className="h-6.5 w-16 rounded-full bg-zinc-800 skeleton-glow" />
                    </div>

                    {/* League */}
                    {showLeague && (
                        <div className="h-6 w-24 rounded bg-zinc-800 skeleton-glow -mb-2" />
                    )}

                    {/* Teams */}
                    <div className="flex justify-between gap-4">
                        {/* HOME */}
                        <div className="w-1/2 flex flex-col items-center">
                            <div className="mb-2 h-3 w-10 rounded bg-zinc-800 skeleton-glow" />

                            <div className="mb-3 h-6 w-28 max-w-full rounded bg-zinc-800 skeleton-glow" />

                            {/* Team Logo */}
                            <div className="h-16 w-16 rounded-full bg-zinc-800 skeleton-glow" />
                        </div>

                        {/* AWAY */}
                        <div className="w-1/2 flex flex-col items-center">
                            <div className="mb-2 h-3 w-10 rounded bg-zinc-800 skeleton-glow" />

                            <div className="mb-3 h-6 w-28 max-w-full rounded bg-zinc-800 skeleton-glow" />

                            {/* Team Logo */}
                            <div className="h-16 w-16 rounded-full bg-zinc-800 skeleton-glow" />
                        </div>
                    </div>

                    {/* Venue */}
                    <div className="flex justify-center -mb-2 -mt-0.5">
                        <div className="h-4 w-40 rounded bg-zinc-800 skeleton-glow" />
                    </div>

                    {/* Slop score */}
                    <div className="flex flex-row justify-evenly border-t border-zinc-800 pt-4 -pb-1 text-center">
                        <div>
                            <div className="mx-auto mb-4 h-3 w-20 rounded bg-zinc-800 skeleton-glow" />

                            <div className="relative mx-auto h-22 w-22 mb-2 mt-1">
                                {/* Circle */}
                                <div className="
                                    h-full
                                    w-full
                                    rounded-full
                                    border-8
                                    border-zinc-800
                                    skeleton-glow
                                " />

                                {/* Number */}
                                <div className="
                                    absolute
                                    inset-0
                                    flex
                                    items-center
                                    justify-center
                                ">
                                    <div className="
                                        h-5
                                        w-14
                                        rounded
                                        bg-zinc-800
                                        skeleton-glow
                                    " />
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="mx-auto mb-4 h-3 w-20 rounded bg-zinc-800 skeleton-glow" />

                            <div className="relative mx-auto h-22 w-22 mb-2 mt-1">
                                {/* Circle */}
                                <div className="
                                    h-full
                                    w-full
                                    rounded-full
                                    border-8
                                    border-zinc-800
                                    skeleton-glow
                                " />

                                {/* Number */}
                                <div className="
                                    absolute
                                    inset-0
                                    flex
                                    items-center
                                    justify-center
                                ">
                                    <div className="
                                        h-5
                                        w-14
                                        rounded
                                        bg-zinc-800
                                        skeleton-glow
                                    " />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="space-y-4">
                        <div className="h-10 w-full rounded-lg bg-zinc-800 skeleton-glow" />
                        <div className="h-10 w-full rounded-lg bg-zinc-800 skeleton-glow" />
                    </div>
                </div>
            ))}
        </div>

    );
}