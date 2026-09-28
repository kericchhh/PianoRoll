export function pixelToPitch(
    pixelY: number,
    highestVisiblePitch: number,
    rowHeight: number
): number {
    return highestVisiblePitch - Math.floor(pixelY / rowHeight)
}
