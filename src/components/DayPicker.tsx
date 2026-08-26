"use client";

import { useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/style.css";

type DayPickerClientProps = {
    onChange: (range: DateRange | undefined) => void;
    initialRange?: DateRange;
    initialMonth?: Date;
};

export default function DayPickerClient({
    onChange,
    initialRange,
    initialMonth,
}: DayPickerClientProps) {
    const [range, setRange] = useState<DateRange | undefined>(
        initialRange
    );
    const [open, setOpen] = useState(false);

    const formatDate = (date: Date) =>
        `${String(date.getDate()).padStart(2, "0")}/${String(
            date.getMonth() + 1
        ).padStart(2, "0")}/${date.getFullYear()}`;

    const dateLabel = range?.from
        ? range.to
            ? `${formatDate(range.from)} - ${formatDate(range.to)}`
            : formatDate(range.from)
        : "Select dates";

    const handleApply = () => {
        if (!range?.from || !range?.to) return;

        onChange(range);
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="
                    rounded-lg
                    border
                    border-zinc-700
                    bg-zinc-900
                    px-3
                    py-2
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
                            top-1/4
                            z-50
                            -translate-x-1/2
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
                            onSelect={setRange}
                            defaultMonth={initialMonth}
                        />

                        <button
                            type="button"
                            disabled={!range?.from || !range?.to}
                            onClick={handleApply}
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
                                disabled:cursor-not-allowed
                                disabled:opacity-40
                            "
                        >
                            Apply dates
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}