import { Game } from "./types";

export function addToCalendar(game: Game) {
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