import type {
    MarqueeRect,
    NoteRegion,
    PianoRollView,
} from '@/features/piano-roll/types';
import { pixelToTick } from '@/features/piano-roll/utils/coordinates/pixelToTick';

export function marqueeToRegion(
    rect: MarqueeRect,
    view: PianoRollView,
): NoteRegion | null {
    const left = Math.min(rect.startX, rect.endX);
    const right = Math.max(rect.startX, rect.endX);
    const top = Math.min(rect.startY, rect.endY);
    const bottom = Math.max(rect.startY, rect.endY);
    if (left === right || top === bottom) return null;

    const lowestPitch = Math.max(
        0,
        view.highestVisiblePitch - Math.ceil(bottom / view.rowHeight) + 1,
    );
    const highestPitch = Math.min(
        127,
        view.highestVisiblePitch - Math.floor(top / view.rowHeight),
    );
    if (lowestPitch > highestPitch) return null;

    return {
        startTick: pixelToTick(left, view.pixelsPerTick, view.scrollOffsetX),
        endTick: pixelToTick(right, view.pixelsPerTick, view.scrollOffsetX),
        lowestPitch,
        highestPitch,
    };
}
