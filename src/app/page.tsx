"use client";

import { useState } from "react";

export default function Home() {
    const [league, setLeague] = useState("nba");

    return (
        <main className="flex flex-1 bg-zinc-950 text-white">
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

                    <div className="
                        mt-8 
                        rounded-full 
                        border 
                        border-zinc-800 
                        bg-zinc-900 
                        px-4 
                        py-1.5 
                        text-sm 
                        text-zinc-400
                    ">
                        AI-powered sports analytics
                    </div>

                    <p className="
                        mt-4 
                        max-w-2xl 
                        text-lg 
                        leading-8 
                        text-zinc-400
                    ">
                        Find the games you probably shouldn't watch.
                        <br />
                        Slop Watch ranks upcoming games based on how
                        terrible the matchup looks.
                    </p>

                    <a
                        href="https://github.com/LucaMawyin/slop-watch"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                            mt-4
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

                        <button
                            onClick={() => {
                                window.location.href = `/games?league=${league}`;
                            }}
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
                        >
                            View upcoming games
                        </button>
                    </div>

                </section>
            </div>
        </main>
    );
}