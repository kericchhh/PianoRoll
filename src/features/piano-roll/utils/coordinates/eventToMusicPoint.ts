import type { MouseEvent } from 'react';
import type { PianoRollView } from '@/features/piano-roll/types';
import { pixelToPitch } from '@/features/piano-roll/utils/coordinates/pixelToPitch';
import { pixelToTick } from '@/features/piano-roll/utils/coordinates/pixelToTick';
import { clientToCanvasPoint } from '@/features/piano-roll/utils/coordinates/canvasCoordinates';

export function eventToMusicPoint(
    event: MouseEvent<HTMLElement>,
    width: number,
    height: number,
    view: PianoRollView,
    target?: HTMLElement,
) {
    const canvas = target ?? event.currentTarget;
    const point = clientToCanvasPoint(
        canvas,
        event.clientX,
        event.clientY,
        width,
        height,
    );
    if (
        !point ||
        point.x < 0 ||
        point.x >= width ||
        point.y < 0 ||
        point.y >= height
    )
        return;
    const tick = pixelToTick(point.x, view.pixelsPerTick, view.scrollOffsetX);
    const pitch = pixelToPitch(
        point.y,
        view.highestVisiblePitch,
        view.rowHeight,
    );
    return { tick, pitch, ...point };
}
