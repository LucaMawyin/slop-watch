import { Game } from "./types";

function getGameEnd(game: Game) {
    const start = new Date(game.date);

    return new Date(
        start.getTime() + 3 * 60 * 60 * 1000
    );
}

function formatDate(date: Date) {
    return date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
}

export function addToICS(game: Game) {
    const start = new Date(game.date);
    const end = getGameEnd(game);

    const event = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `UID:${game.game_id}@slopwatch`,
        `DTSTART:${formatDate(start)}`,
        `DTEND:${formatDate(end)}`,
        `SUMMARY:${game.away_name} @ ${game.home_name}`,
        `LOCATION:${game.venue_full_name}`,
        `DESCRIPTION:Slop Score: ${(game.slop_percentile * 100).toFixed(1)}%`,
        "END:VEVENT",
        "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([event], {
        type: "text/calendar;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${game.away_name}-at-${game.home_name}.ics`;
    link.click();

    URL.revokeObjectURL(url);
}

export function addToGoogleCalendar(game: Game) {
    const start = new Date(game.date);
    const end = getGameEnd(game);

    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: `${game.away_name} @ ${game.home_name}`,
        dates: `${formatDate(start)}/${formatDate(end)}`,
        location: game.venue_full_name,
        details: `Slop Score: ${(game.slop_percentile * 100).toFixed(1)}%`,
    });

    window.open(
        `https://calendar.google.com/calendar/render?${params}`,
        "_blank"
    );
}

export function addToOutlook(game: Game) {
    const start = new Date(game.date);
    const end = getGameEnd(game);

    const params = new URLSearchParams({
        subject: `${game.away_name} @ ${game.home_name}`,
        body: `Slop Score: ${(game.predicted_slop * 100).toFixed(1)}%`,
        location: game.venue_full_name,
        startdt: start.toISOString(),
        enddt: end.toISOString(),
        path: "/calendar/action/compose",
        rru: "addevent",
    });

    const url =
        `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;

    window.open(url, "_blank");
}