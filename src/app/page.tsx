"use client";

import DayPickerClient from "@/components/DayPicker";
import { useState } from "react";
import { DateRange } from "react-day-picker";

export default function Home() {
    const [league, setLeague] = useState("nba");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    return (
        <main className="
            flex 
            text-white
        ">
            <div className="
                mx-auto 
                flex 
                flex-col 
                items-center 
                justify-center
                max-w-5xl  
                p-6 
                gap-6
                text-center
            ">

                {/* Hero */}
                <section className="
                    flex 
                    flex-1 
                    flex-col 
                    items-center 
                    justify-center
                    text-center
                ">

                    <h1 className="
                        text-6xl 
                        font-bold 
                        tracking-tight 
                        sm:text-7xl
                    ">
                        Slop Watch
                    </h1>

                    <p className="
                        text-zinc-300!
                        mt-4 
                        max-w-2xl 
                        text-lg 
                        leading-8 
                    ">
                        Some games are worth watching.
                        <br />
                        Some games are <b>pure slop</b>.
                    </p>

                    <p className="
                        mt-6
                        text-xs
                        font-medium
                        uppercase
                        tracking-[0.2em]
                        text-zinc-500
                    ">
                        AI-powered sports analytics
                    </p>

                    <a
                        href="https://github.com/LucaMawyin/slop-watch"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                            mt-6
                            text-sm
                            text-zinc-500
                            underline
                            underline-offset-4
                            transition
                            hover:text-zinc-300
                        "
                    >
                        View source code →
                    </a>

                    {/* Controls */}
                    <div className="
                        mt-8
                        flex
                        flex-col
                        items-center
                        gap-6
                    ">
                        {/* Filters */}
                        <div className="
                            flex
                            items-center
                            gap-3
                        ">
                            <select
                                value={league}
                                onChange={(e) => setLeague(e.target.value)}
                                className="
                                    rounded-lg
                                    border
                                    border-zinc-700
                                    bg-zinc-900
                                    px-4 py-3
                                    text-sm
                                    outline-none
                                    transition
                                    focus:border-zinc-500
                                "
                            >
                                <option value="nba">NBA</option>
                                <option value="nfl">NFL</option>
                                <option value="nhl">NHL</option>
                                <option value="mlb">MLB</option>
                            </select>

                            <DayPickerClient onChange={setDateRange} />
                        </div>

                        {/* Button */}
                        <button
                            className="
                                rounded-lg
                                bg-white
                                px-5
                                py-3
                                text-sm
                                font-semibold
                                text-black
                                transition
                                hover:bg-zinc-200
                            "
                            onClick={() => {
                                const params = new URLSearchParams();

                                params.set("league", league);

                                if (dateRange?.from) {
                                    params.set(
                                        "start",
                                        dateRange.from.toISOString().split("T")[0]
                                    );
                                }

                                if (dateRange?.to) {
                                    params.set(
                                        "end",
                                        dateRange.to.toISOString().split("T")[0]
                                    );
                                }

                                window.location.href = `/games?${params.toString()}`;
                            }}
                        >
                            Show Me The Slop &gt;
                        </button>
                    </div>

                </section>
            </div>
        </main>
    );
}