export function pitchToPixel(
    pitch: number,
    highestVisiblePitch: number,
    rowHeight: number
): number {
    return (highestVisiblePitch - pitch) * rowHeight
};
