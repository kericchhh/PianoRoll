export function clampScroll(
    scroll: number, 
    endTick: number, 
    pixelsPerTick: number, 
    viewportWidth: number
): number {
    const maxScroll = Math.max(0, endTick * pixelsPerTick - viewportWidth)
    return Math.min(maxScroll, Math.max(0, scroll))
}
