export function getSlopBadge(score: number) {
    const percentage = score * 100;

    if (percentage >= 95) {
        return {
            title: "Hall of Fame Slop",
            className: "border-red-500/40 bg-red-500/15 text-red-400",
        };
    }

    if (percentage >= 87.5) {
        return {
            title: "Historic Slop",
            className: "border-rose-500/40 bg-rose-500/15 text-rose-400",
        };
    }

    if (percentage >= 80) {
        return {
            title: "Slop Supreme",
            className: "border-orange-500/40 bg-orange-500/15 text-orange-400",
        };
    }

    if (percentage >= 72.5) {
        return {
            title: "Grade-A Slop",
            className: "border-amber-500/40 bg-amber-500/15 text-amber-400",
        };
    }

    if (percentage >= 65) {
        return {
            title: "Certified Slop",
            className: "border-yellow-500/40 bg-yellow-500/15 text-yellow-400",
        };
    }

    if (percentage >= 57.5) {
        return {
            title: "Suspicious",
            className: "border-yellow-500/40 bg-yellow-500/15 text-yellow-400",
        };
    }

    if (percentage >= 50) {
        return {
            title: "Some Slop Signals",
            className: "border-blue-300/40 bg-blue-600/15 text-blue-300",
        };
    }

    if (percentage >= 40) {
        return {
            title: "Mild",
            className: "border-lime-500/40 bg-lime-500/15 text-lime-400",
        };
    }

    return {
        title: "Low Slop Risk",
        className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
    };
}