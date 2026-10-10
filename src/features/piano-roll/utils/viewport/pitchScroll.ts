import { ROW_HEIGHT } from '@/features/piano-roll/constants';

export function clampHighestPitch(pitch: number, height: number): number {
    const minimum = Math.min(
        127,
        Math.max(0, Math.floor(height / ROW_HEIGHT) - 1),
    );
    return Math.max(minimum, Math.min(127, Math.round(pitch)));
}

export function pitchScrollDelta(
    deltaY: number,
    deltaMode: number,
    height: number,
    remainder: number,
) {
    const unit = deltaMode === 1 ? ROW_HEIGHT : deltaMode === 2 ? height : 1;
    const pixels = remainder + deltaY * unit;
    const rows = Math.trunc(pixels / ROW_HEIGHT);
    return { rows: -rows, remainder: pixels - rows * ROW_HEIGHT };
}
