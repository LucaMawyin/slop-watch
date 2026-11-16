import { logoUrl } from "@sportsdataverse/sdvplot";

const leagueMap = {
    nba: "nba",
    wnba: "wnba",
    mlb: "mlb",
    nfl: "nfl",
    cfb: "cfb",
    nhl: "nhl",
    pwhl: "pwhl",
    mls: "soccer",
    epl: "soccer",
    laliga: "soccer",
    serie_a: "soccer",
    bundesliga: "soccer",
    ligue_1: "soccer",
} as const;

type SupportedLeague = Parameters<typeof logoUrl>[1];

export async function getTeamLogo(
    league: string,
    teamId: string | number | null,
    teamName: string
): Promise<string | undefined> {
    const mappedLeague =
        leagueMap[league as keyof typeof leagueMap];

    if (!mappedLeague || !teamName.trim()) {
        return undefined;
    }

    try {
        // Use id when available otherwise search by name
        const identifier =
            teamId !== null && String(teamId).trim() !== ""
                ? String(teamId)
                : teamName;

        return await logoUrl(
            identifier,
            mappedLeague as SupportedLeague
        );
    } catch (error) {
        console.error("Failed to fetch team logo:", error);
        return undefined;
    }
}