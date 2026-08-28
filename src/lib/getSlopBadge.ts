import { getHeatColour } from "./getHeatColour";

export function getSlopBadge(sloppiness: number, watchability: number) {
    
    const combinedScore = (sloppiness + watchability) / 2;
    const colour = getHeatColour(combinedScore);

    // Exceptional watchability
    if (watchability >= 0.9) {
        if (sloppiness >= 0.9) {
            return { title: "Hall of Fame Slop", colour };
        }

        if (sloppiness >= 0.75) {
            return { title: "Legendary Slop", colour };
        }

        if (sloppiness >= 0.5) {
            return { title: "Elite Slop", colour };
        }

        return { title: "Instant Classic", colour };
    }

    // High watchability
    if (watchability >= 0.75) {
        if (sloppiness >= 0.9) {
            return { title: "Premium Slop", colour };
        }

        if (sloppiness >= 0.75) {
            return { title: "Good Slop", colour };
        }

        if (sloppiness >= 0.5) {
            return { title: "Fun Slop", colour };
        }

        return { title: "Slopless Banger", colour };
    }

    // Above average watchability
    if (watchability >= 0.6) {
        if (sloppiness >= 0.9) {
            return { title: "Great Slop", colour };
        }

        if (sloppiness >= 0.75) {
            return { title: "Good Slop", colour };
        }

        if (sloppiness >= 0.5) {
            return { title: "Entertaining Slop", colour };
        }

        return { title: "Worth Watching", colour };
    }

    // Average watchability
    if (watchability >= 0.4) {
        if (sloppiness >= 0.9) {
            return { title: "Chaotic Slop", colour };
        }

        if (sloppiness >= 0.75) {
            return { title: "Decent Slop", colour };
        }

        if (sloppiness >= 0.5) {
            return { title: "Some Slop", colour };
        }

        return { title: "Mildly Interesting", colour };
    }

    // Low watchability
    if (sloppiness >= 0.9) {
        return { title: "Historic Disaster", colour };
    }

    if (sloppiness >= 0.75) {
        return { title: "Bad Slop", colour };
    }

    if (sloppiness >= 0.5) {
        return { title: "Forgettable Slop", colour };
    }

    return { title: "Skip It", colour };
}