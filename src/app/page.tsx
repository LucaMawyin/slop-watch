"use client";

import DayPickerClient from "@/components/DayPicker";
import { leagues } from "@/lib/leagues";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

export default function Home() {
    const [league, setLeague] = useState("");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    return (

        <div className="
            text-white
            mx-auto 
            flex 
            flex-col 
            max-w-5xl  
            p-6 
            gap-6
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
                    <div className="relative">
                        <select
                            value={league}
                            onChange={(e) => setLeague(e.target.value)}
                            className="
                                appearance-none
                                rounded-lg
                                px-3
                                py-2
                                pr-9
                                text-sm
                                outline-none
                                transition
                                truncate
                                w-30
                                border
                                border-zinc-700
                                text-zinc-200
                                bg-zinc-900
                                hover:border-zinc-600
                                focus:border-zinc-500
                            "
                        >
                            <option value="">
                                All Leagues
                            </option>
                            {[...leagues]
                                .sort((a, b) => a.sport.localeCompare(b.sport))
                                .map((league) => (
                                    <option
                                        key={league.id}
                                        value={league.id}
                                        className=""
                                    >
                                        {league.name}
                                    </option>
                                ))}
                        </select>

                        <ChevronDown
                            size={16}
                            className="
                                pointer-events-none
                                absolute
                                right-3
                                top-1/2
                                -translate-y-1/2
                                text-zinc-400
                            "
                        />
                    </div>

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

                            league && params.set("league", league);

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
                        Show Me The Slop
                    </button>
                </div>

            </section>
        </div>
    );
}