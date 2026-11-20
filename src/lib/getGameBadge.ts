import { getSlopBadge } from "@/lib/getSlopBadge";
import { Game } from "@/lib/types";

export const getGameBadge = (game: Game) => {
    const slop = game.slop_percentile;
    const watchability = game.watchability_percentile;

    if (slop === null || watchability === null) {
        return null;
    }

    return getSlopBadge(slop, watchability);
};