export function scrollAfterZoom(
    cursorX: number,
    scroll: number,
    scale: number,
    newScale: number,
): number {
    const anchorTick = (cursorX + scroll) / scale;
    return anchorTick * newScale - cursorX;
}
