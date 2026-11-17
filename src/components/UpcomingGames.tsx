"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Game } from "@/lib/types";
import FeaturedGameCard from "./FeaturedGameCard";
import GamesSkeleton from "./GamesSkeleton";

interface UpcomingGamesProps {
    games: Game[];
    category?: string;
    loading?:boolean;
    name?:string;
}

export default function UpcomingGames() {
    return (
        <div className="p-6 text-white">
            UpcomingGames test
        </div>
    );
}

