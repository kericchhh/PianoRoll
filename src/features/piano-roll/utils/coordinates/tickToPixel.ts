export function tickToPixel(
    tick: number,
    pixelsPerTick: number,
    scrollOffsetX: number,
): number {
    return tick * pixelsPerTick - scrollOffsetX;
}
