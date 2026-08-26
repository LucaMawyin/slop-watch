export default function GamesSkeleton(){
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
                    <div className="flex items-start justify-between -mb-3">
                        <div className="h-5 w-32 rounded bg-zinc-800 skeleton-glow" />
                        <div className="h-6 w-16 rounded-full bg-zinc-800 skeleton-glow" />
                    </div>

                    {/* Teams */}
                    <div className="flex justify-between -mb-2">
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
                    <div className="flex justify-center">
                        <div className="h-4 w-40 rounded bg-zinc-800 skeleton-glow" />
                    </div>

                    {/* Slop score */}
                    <div className="border-t border-zinc-800 pt-4 text-center">
                        <div className="mx-auto mb-3 h-3 w-20 rounded bg-zinc-800 skeleton-glow" />

                        <div className="relative mx-auto h-24 w-24">
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