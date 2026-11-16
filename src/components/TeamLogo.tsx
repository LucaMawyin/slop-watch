"use client";

import { useEffect, useState } from "react";
import { getTeamLogo } from "@/lib/teamLogos";

interface TeamLogoProps {
    league: string;
    teamId: string | number | null;
    teamName: string;
    displayName?: string;
    className?: string;
}

export default function TeamLogo({
    league,
    teamId,
    teamName,
    displayName,
    className = `
        h-16
        w-16
        sm:h-20 
        sm:w-20
    `,
}: TeamLogoProps) {
    const [logo, setLogo] = useState<string>();

    useEffect(() => {
        let active = true;

        setLogo(undefined);

        getTeamLogo(league, teamId, teamName)
            .then((url) => {
                if (active) setLogo(url);
            })
            .catch(() => {
                if (active) setLogo(undefined);
            });

        return () => {
            active = false;
        };
    }, [league, teamId, teamName]);

    if (!logo) return null;

    return (
        <img
            src={logo}
            alt={`${displayName ?? teamName} logo`}
            className={`${className} object-contain`}
        />
    );
}