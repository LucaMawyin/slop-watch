"use client";

import { useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/style.css";

type DayPickerClientProps = {
    onChange: (range: DateRange | undefined) => void;
};

export default function DayPickerClient({
    onChange,
}: DayPickerClientProps) {
    const [range, setRange] = useState<DateRange | undefined>();
    const [open, setOpen] = useState(false);

    const handleSelect = (newRange: DateRange | undefined) => {
        setRange(newRange);
        onChange(newRange);
    };

    const dateLabel = range?.from
        ? range.to
            ? `${range.from.toLocaleDateString()} – ${range.to.toLocaleDateString()}`
            : range.from.toLocaleDateString()
        : "Select dates";

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="
                    rounded-lg
                    border
                    border-zinc-700
                    bg-zinc-900
                    px-4
                    py-3
                    text-sm
                    text-white
                    outline-none
                    transition
                    hover:border-zinc-600
                    focus:border-zinc-500
                "
            >
                📅 {dateLabel}
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/60"
                        onClick={() => setOpen(false)}
                    />

                    <div
                        className="
                            fixed
                            left-1/2
                            top-1/2
                            z-50
                            -translate-x-1/2
                            -translate-y-1/2
                            rounded-xl
                            border
                            border-zinc-800
                            bg-zinc-950
                            p-4
                            shadow-2xl
                        "
                    >
                        <DayPicker
                            mode="range"
                            selected={range}
                            onSelect={handleSelect}
                        />

                        {range?.from && range?.to && (
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    bg-white
                                    px-4
                                    py-2
                                    text-sm
                                    font-semibold
                                    text-black
                                    transition
                                    hover:bg-zinc-200
                                "
                            >
                                Apply dates
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}