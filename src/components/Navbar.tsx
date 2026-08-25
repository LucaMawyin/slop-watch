"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { leagues } from "@/lib/leagues";

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [openSport, setOpenSport] = useState<string | null>(null);

    const sports = [...new Set(leagues.map((league) => league.sport))];

    return (
        <nav className="border-b border-zinc-800">
            <div className="flex items-center justify-between px-6 py-4">
                <Link
                    href="/"
                    className="text-xl font-bold text-white"
                >
                    Slop Watch
                </Link>

                {/* Desktop */}
                <div className="hidden md:flex items-center gap-6">
                    {sports.map((sport) => (
                        <div key={sport} className="flex items-center gap-4">
                            {leagues
                                .filter((league) => league.sport === sport)
                                .map((league) => (
                                    <Link
                                        key={league.id}
                                        href={`/games?league=${league.id}`}
                                        className="text-sm text-zinc-300 hover:text-white"
                                    >
                                        {league.name}
                                    </Link>
                                ))}
                        </div>
                    ))}
                </div>

                {/* Mobile */}
                <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="md:hidden text-zinc-300 hover:text-white"
                    aria-label="Toggle menu"
                >
                    {menuOpen ? (
                        <X size={24} />
                    ) : (
                        <Menu size={24} />
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="
                    absolute
                    left-0
                    right-0
                    z-50
                    border-t
                    border-zinc-800
                    bg-zinc-950
                    px-6
                    py-2
                    shadow-lg
                    md:hidden
                ">
                    {sports.map((sport) => {
                        const isOpen = openSport === sport;

                        return (
                            <div key={sport}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpenSport(
                                            isOpen ? null : sport
                                        )
                                    }
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        justify-between
                                        py-4
                                        text-sm
                                        font-medium
                                        text-zinc-300
                                    "
                                >
                                    <span>{sport}</span>

                                    <ChevronDown
                                        size={16}
                                        className={`
                                            transition-transform
                                            ${isOpen ? "rotate-180" : ""}
                                        `}
                                    />
                                </button>

                                {isOpen && (
                                    <div className="border-t border-zinc-800">
                                        {leagues
                                            .filter(
                                                (league) =>
                                                    league.sport === sport
                                            )
                                            .map((league) => (
                                                <Link
                                                    key={league.id}
                                                    href={`/games?league=${league.id}`}
                                                    onClick={() =>
                                                        setMenuOpen(false)
                                                    }
                                                    className="
                                                        block
                                                        py-3
                                                        pl-4
                                                        text-sm
                                                        text-zinc-400
                                                        hover:text-white
                                                    "
                                                >
                                                    {league.name}
                                                </Link>
                                            ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </nav>
    );
}