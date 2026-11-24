
"use client";

import { useState, useEffect } from "react";
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
    const [appliedRange, setAppliedRange] = useState<DateRange | undefined>(initialRange);
    const [range, setRange] = useState<DateRange | undefined>(initialRange);

    const [month, setMonth] = useState<Date>(
        initialMonth ?? initialRange?.from ?? new Date()
    );

    const [open, setOpen] = useState(false);

    const formatDate = (date: Date) =>
        `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
            date.getDate()
        ).padStart(2, "0")}/${date.getFullYear()}`;

    const dateLabel = range?.from
        ? range.to
            ? `${formatDate(range.from)} - ${formatDate(range.to)}`
            : formatDate(range.from)
        : "Select dates";

    const handleOpen = () => {
        setRange(appliedRange);
        setOpen(true);
    };

    const handleClose = () => {
        setRange(appliedRange);
        setOpen(false);
    };

    const handleApply = () => {
        if (!range?.from || !range?.to) return;

        setAppliedRange(range);
        onChange(range);
        setOpen(false);
    };

    const handleToday = () => {
        const today = new Date();
        const todayRange = { from: today, to: today };

        setRange(todayRange);
        setMonth(today);
    };

    const today = new Date();

    return (
        <div className="relative">
            <button
                type="button"
                onClick={handleOpen}
                className="
                    rounded-lg border border-zinc-700
                    bg-zinc-900 px-3 py-2 text-sm
                    text-white outline-none transition
                    hover:border-zinc-600 focus:border-zinc-500
                "
            >
                📅 {dateLabel}
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/60"
                        onClick={handleClose}
                    />

                    <div
                        className="
                            fixed left-1/2 top-1/4 z-50
                            -translate-x-1/2 rounded-xl
                            border border-zinc-800
                            bg-zinc-950 p-4 shadow-2xl
                        "
                    >
                        <DayPicker
                            mode="range"
                            selected={range}
                            onSelect={setRange}
                            month={month}
                            onMonthChange={setMonth}
                            captionLayout="dropdown"
                            startMonth={new Date(
                                today.getFullYear() - 5,
                                today.getMonth(),
                                1
                            )}
                            endMonth={new Date(
                                today.getFullYear() + 1,
                                today.getMonth(),
                                1
                            )}
                            classNames={{
                                dropdown:
                                    "rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-white",
                                dropdowns: "flex gap-2",
                                caption_label: "hidden",
                                button_previous: "ml-2",
                                button_next: "ml-2",
                            }}
                        />

                        <div className="mt-3 flex gap-2">

                            <button
                                type="button"
                                onClick={handleToday}
                                className="
                                    flex-1 rounded-lg border border-zinc-700
                                    px-3 py-2 text-sm text-zinc-300
                                    transition hover:bg-zinc-800
                                "
                            >
                                Today
                            </button>

                            <button
                                type="button"
                                disabled={!range?.from || !range?.to}
                                onClick={handleApply}
                                className="
                                    flex-1 rounded-lg bg-white
                                    px-3 py-2 text-sm font-semibold
                                    text-black transition hover:bg-zinc-200
                                    disabled:cursor-not-allowed
                                    disabled:opacity-40
                                "
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
