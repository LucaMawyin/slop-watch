export function getSlopBadge(score: number) {
    const percentage = score * 100;

    if (percentage >= 95) {
        return {
            title: "Hall of Fame Slop",
            className: "border-red-500/40 bg-red-500/15 text-red-400",
        };
    }

    if (percentage >= 90) {
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

    if (percentage >= 70) {
        return {
            title: "Grade-A Slop",
            className: "border-amber-500/40 bg-amber-500/15 text-amber-400",
        };
    }

    if (percentage >= 60) {
        return {
            title: "Certified Slop",
            className: "border-yellow-500/40 bg-yellow-500/15 text-yellow-400",
        };
    }

    if (percentage >= 50) {
        return {
            title: "Potential Slop",
            className: "border-lime-500/40 bg-lime-500/15 text-lime-400",
        };
    }

    if (percentage >= 40) {
        return {
            title: "Mediocre",
            className: "border-blue-500/40 bg-blue-500/15 text-blue-400",
        };
    }

    return {
        title: "Not Slop",
        className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
    };
}
