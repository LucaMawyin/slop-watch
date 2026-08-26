"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { leagues } from "@/lib/leagues";

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [openSport, setOpenSport] = useState<string | null>(null);

    const sports = [...new Set(leagues.sort((a,b) => a.sport.localeCompare(b.sport)).map((league) => league.sport))];

    // Navbar click off
    const navRef = useRef<HTMLElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // Desktop dropdown
            if (
                window.innerWidth >= 768 &&
                navRef.current &&
                !navRef.current.contains(target)
            ) {
                setOpenSport(null);
            }

            // Mobile drawer
            if (
                window.innerWidth < 768 &&
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(target)
            ) {
                setOpenSport(null);
                setMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <nav 
            ref={navRef}
            className={`sticky top-0 z-50 border-b border-zinc-800`}
        >
            <div className="flex items-center justify-between px-6 py-4">
                <Link
                    href="/"
                    className="text-xl font-bold text-white"
                >
                    Slop Watch
                </Link>

                {/* Desktop */}
                <div className="hidden md:flex flex-1 justify-evenly items-center gap-6">
                    {sports.map((sport) => {

                        const sportLeagues = leagues.filter(
                            (league) => league.sport === sport
                        );

                        const isOpen = openSport === sport;

                        return (
                            <div 
                                key={sport} 
                                className="relative group"
                                onMouseEnter={() => {
                                    if (window.matchMedia("(hover: hover)").matches) {
                                        setOpenSport(sport);
                                    }
                                }}
                                onMouseLeave={() => {
                                    // Only desktop hover behavior
                                    if (window.matchMedia("(hover: hover)").matches) {
                                        setOpenSport(null);
                                    }
                                }}
                            >   
                                <div
                                    className="flex items-center"
                                >
                                    <Link 
                                        href={`/games?sport=${encodeURIComponent(sport).toLowerCase()}`}
                                        className="text-sm text-zinc-300 hover:text-white"
                                    >
                                        {sport}
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOpenSport(isOpen ? null : sport)
                                        }
                                        className="ml-1 p-1 text-zinc-400 hover:text-white"
                                        aria-label={`Show ${sport} leagues`}
                                        aria-expanded={isOpen}
                                    >
                                        <ChevronDown
                                            size={14}
                                            className={`
                                                transition-transform
                                                ${isOpen ? "rotate-180" : ""}
                                            `}
                                        />
                                    </button>
                                </div>

                                
                                {/* DROPDOWN */}
                                <div className={`
                                    absolute
                                    -right-2
                                    top-full
                                    z-50
                                    pt-2
                                    text-nowrap

                                    opacity-0
                                    pointer-events-none
                                    
                                    group-hover:opacity-100
                                    group-hover:pointer-events-auto

                                    ${openSport === sport
                                        ? "opacity-100 pointer-events-auto"
                                        : ""}
                                `}>
                                    <div className="
                                        min-w-32
                                        rounded-md
                                        border
                                        border-zinc-800
                                        bg-zinc-950
                                        py-1
                                        shadow-lg
                                    ">
                                        {sportLeagues.map((league) => (
                                            <Link
                                                key={league.id}
                                                href={`/games?league=${league.id}`}
                                                onClick={() => setOpenSport(null)}
                                                className="
                                                    block
                                                    px-4
                                                    py-2
                                                    text-sm
                                                    text-zinc-300
                                                    hover:bg-zinc-900
                                                    hover:text-white
                                                "
                                            >
                                                {league.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )

                    })}
                </div>

                {/* Mobile */}
                <button
                    type="button"
                    onClick={() => {
                        setMenuOpen(!menuOpen);
                        setOpenSport(null);
                    }}
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
            <div
                ref={mobileMenuRef}
                className={`
                    fixed
                    left-0
                    right-0
                    top-14
                    z-40
                    max-h-[calc(100vh-3.5rem)]
                    overflow-y-auto
                    overscroll-contain
                    border-b
                    border-zinc-800
                    bg-zinc-950
                    px-6
                    py-2
                    shadow-lg
                    md:hidden
                    transition-transform
                    duration-200
                    ease-out
                    ${
                        menuOpen
                            ? "translate-y-0"
                            : "-translate-y-[calc(100%+60px)] pointer-events-none"
                    }
                `}
            >
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
                                <div className="
                                    ml-3
                                    mb-2
                                    border-l
                                    border-zinc-700
                                    pl-4
                                ">
                                    {leagues
                                        .filter(
                                            (league) =>
                                                league.sport === sport
                                        )
                                        .map((league) => (
                                            <Link
                                                key={league.id}
                                                href={`/games?league=${league.id}`}
                                                onClick={() =>{
                                                    setOpenSport(null);
                                                    setMenuOpen(false);
                                                }}
                                                className="
                                                    block
                                                    py-2
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


        </nav>
    );
}