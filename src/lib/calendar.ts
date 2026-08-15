import { Game } from "./types";

export function addToICS(game: Game) {
    const start = new Date(game.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const formatDate = (date: Date) =>
        date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const event = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `UID:${game.game_id}@slopwatch`,
        `DTSTART:${formatDate(start)}`,
        `DTEND:${formatDate(end)}`,
        `SUMMARY:${game.away_name} @ ${game.home_name}`,
        `DESCRIPTION:Slop Score: ${(game.predicted_slop * 100).toFixed(1)}%`,
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
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const formatDate = (date: Date) =>
        date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const url = new URL("https://calendar.google.com/calendar/render");

    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set(
        "text",
        `${game.away_name} @ ${game.home_name}`
    );
    url.searchParams.set(
        "dates",
        `${formatDate(start)}/${formatDate(end)}`
    );
    url.searchParams.set(
        "details",
        `Slop Score: ${(game.predicted_slop * 100).toFixed(1)}%`
    );

    window.open(url.toString(), "_blank");
}

export function addToOutlook(game: Game) {
    const start = new Date(game.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const url = new URL(
        "https://outlook.live.com/calendar/0/deeplink/compose"
    );

    url.searchParams.set("path", "/calendar/action/compose");
    url.searchParams.set(
        "subject",
        `${game.away_name} @ ${game.home_name}`
    );
    url.searchParams.set("startdt", start.toISOString());
    url.searchParams.set("enddt", end.toISOString());
    url.searchParams.set(
        "body",
        `Slop Score: ${(game.predicted_slop * 100).toFixed(1)}%`
    );

    window.open(url.toString(), "_blank");
}