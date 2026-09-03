
"use client";

import { useState } from "react";
import { addToGoogleCalendar, addToICS, addToOutlook } from "@/lib/calendar";
import { createPortal } from "react-dom";
import { Game } from "@/lib/types";

type Props = {
    game: Game;
};

export default function AddToCalendar({ game }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="
                    w-full
                    rounded-lg
                    border
                    border-zinc-700
                    bg-zinc-800
                    px-4
                    py-2
                    text-sm
                    font-medium
                    text-zinc-200
                    transition
                    hover:bg-zinc-700
                "
            >
                Add to Calendar
            </button>

            {open && (

                createPortal(
                    <div
                        className="
                            fixed
                            inset-0
                            z-50
                            flex
                            items-center
                            justify-center
                            bg-black/60
                            p-4
                        "
                        onClick={() => setOpen(false)}
                    >
                        <div
                            className="
                                w-full
                                max-w-sm
                                rounded-xl
                                border
                                border-zinc-800
                                bg-zinc-900
                                p-6
                                shadow-xl
                            "
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">
                                    Add to Calendar
                                </h2>

                                <button
                                    onClick={() => setOpen(false)}
                                    className="
                                        text-zinc-500
                                        transition
                                        hover:text-zinc-300
                                    "
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="mt-2 text-sm text-zinc-400">
                                {game.away_name} @ {game.home_name}
                            </div>

                            <div className="mt-5 space-y-2">
                                <button
                                    onClick={() => {
                                        addToICS(game);
                                        setOpen(false);
                                    }}
                                    className="
                                        w-full
                                        rounded-lg
                                        border
                                        border-zinc-700
                                        bg-zinc-800
                                        px-4
                                        py-3
                                        text-left
                                        transition
                                        hover:border-zinc-600
                                        hover:bg-zinc-700
                                    "
                                >
                                    <div className="font-medium">
                                        Apple Calendar
                                    </div>

                                    <div className="text-xs text-zinc-500">
                                        Download .ics file
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        addToGoogleCalendar(game);
                                        setOpen(false);
                                    }}
                                    className="
                                        w-full
                                        rounded-lg
                                        border
                                        border-zinc-700
                                        bg-zinc-800
                                        px-4
                                        py-3
                                        text-left
                                        transition
                                        hover:border-zinc-600
                                        hover:bg-zinc-700
                                    "
                                >
                                    <div className="font-medium">
                                        Google Calendar
                                    </div>

                                    <div className="text-xs text-zinc-500">
                                        Open Google Calendar
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        addToOutlook(game);
                                        setOpen(false);
                                    }}
                                    className="
                                        w-full
                                        rounded-lg
                                        border
                                        border-zinc-700
                                        bg-zinc-800
                                        px-4
                                        py-3
                                        text-left
                                        transition
                                        hover:border-zinc-600
                                        hover:bg-zinc-700
                                    "
                                >
                                    <div className="font-medium">
                                        Outlook
                                    </div>

                                    <div className="text-xs text-zinc-500">
                                        Open Outlook Calendar
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>, 
                    document.body
                )

            )}
        </>
    );
}