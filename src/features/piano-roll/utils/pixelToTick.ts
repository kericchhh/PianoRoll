export function pixelToTick(
    pixelX: number,
    pixelsPerTick: number,
    scrollOffsetX: number,
): number {
    return (pixelX + scrollOffsetX) / pixelsPerTick;
}
