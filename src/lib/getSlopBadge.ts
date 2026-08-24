export function getSlopBadge(score: number) {
    const percentage = score * 100;

    if (percentage >= 95) {
        return {
            title: "Hall of Fame Slop",
            borderColour: "border-red-500/40",
            bgColour: "bg-red-500/15",
            textColour: "text-red-400",
        };
    }

    if (percentage >= 87.5) {
        return {
            title: "Historic Slop",
            borderColour: "border-rose-500/40",
            bgColour: "bg-rose-500/15",
            textColour: "text-rose-400",
        };
    }

    if (percentage >= 80) {
        return {
            title: "Slop Supreme",
            borderColour: "border-orange-500/40",
            bgColour: "bg-orange-500/15",
            textColour: "text-orange-400",
        };
    }

    if (percentage >= 72.5) {
        return {
            title: "Grade-A Slop",
            borderColour: "border-amber-500/40",
            bgColour: "bg-amber-500/15",
            textColour: "text-amber-400",
        };
    }

    if (percentage >= 65) {
        return {
            title: "Certified Slop",
            borderColour: "border-yellow-500/40",
            bgColour: "bg-yellow-500/15",
            textColour: "text-yellow-400",
        };
    }

    if (percentage >= 55) {
        return {
            title: "Suspicious",
            borderColour: "border-purple-300/40",
            bgColour: "bg-purple-600/15",
            textColour: "text-purple-300",
        };
    }

    if (percentage >= 50) {
        return {
            title: "Traces of Slop",
            borderColour: "border-blue-300/40",
            bgColour: "bg-blue-600/15",
            textColour: "text-blue-300",
        };
    }

    if (percentage >= 45) {
        return {
            title: "Slop Potential",
            borderColour: "border-lime-500/40",
            bgColour: "bg-lime-500/15",
            textColour: "text-lime-400",
        };
    }

    return {
        title: "Low Slop Risk",
        borderColour: "border-emerald-500/40",
        bgColour: "bg-emerald-500/15",
        textColour: "text-emerald-400",
    };
}