"use client";

import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6 text-center text-white">
            <div className="space-y-2">
                <h1 className="text-8xl font-bold tracking-tight">
                    404
                </h1>

                <h2 className="text-2xl font-semibold">
                    Page Not Found
                </h2>

                <p className="max-w-md text-zinc-400">
                    Looks like this page is out of bounds.
                    The page you're looking for doesn't exist or may have been moved.
                </p>
            </div>

            <Link
                href="/"
                className="
                    rounded-lg
                    border
                    border-zinc-700
                    bg-zinc-900
                    px-6
                    py-3
                    text-sm
                    font-medium
                    text-zinc-200
                    transition
                    hover:bg-zinc-800
                    hover:no-underline!
                    hover:text-zinc-200!
                "
            >
                Back to Home
            </Link>
        </main>
    );
}