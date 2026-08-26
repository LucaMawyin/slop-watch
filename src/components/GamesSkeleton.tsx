type GamesSkeletonProps = {
    showLeague?: boolean;
};

export default function GamesSkeleton({
    showLeague = false,
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
            {Array.from({ length: 9 }).map((_, i) => (
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
                    <div className="flex justify-between -mb-1">
                        <div className="max-w-[50%]">
                            <div className="mb-2 h-3 w-10 rounded bg-zinc-800 skeleton-glow" />
                            <div className="h-6 w-28 rounded bg-zinc-800 skeleton-glow" />
                        </div>

                        <div className="flex max-w-[50%] flex-col items-end">
                            <div className="mb-2 h-3 w-10 rounded bg-zinc-800 skeleton-glow" />
                            <div className="h-6 w-28 rounded bg-zinc-800 skeleton-glow" />
                        </div>
                    </div>

                    {/* Venue */}
                    <div className="flex justify-center -mb-2 -mt-0.5">
                        <div className="h-4 w-40 rounded bg-zinc-800 skeleton-glow" />
                    </div>

                    {/* Slop score */}
                    <div className="border-t border-zinc-800 pt-4 -pb-1 text-center">
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

                    {/* Calendar button */}
                    <div className="h-10 w-full rounded-lg bg-zinc-800 skeleton-glow" />
                </div>
            ))}
        </div>

    );
}