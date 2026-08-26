export const getHeatColour = (slop: number) => {
    if (slop <= 0.5) {
        const t = slop / 0.5;

        return `rgb(
            ${Math.round(34 + (234 - 34) * t)},
            ${Math.round(197 + (179 - 197) * t)},
            ${Math.round(94 + (8 - 94) * t)}
        )`;
    }

    const t = (slop - 0.5) / 0.5;

    return `rgb(
        ${Math.round(234 + (239 - 234) * t)},
        ${Math.round(179 + (68 - 179) * t)},
        ${Math.round(8 + (68 - 8) * t)}
    )`;
};