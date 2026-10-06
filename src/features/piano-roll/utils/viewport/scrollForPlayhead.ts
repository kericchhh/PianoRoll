import type { PianoRollView } from '@/features/piano-roll/types';
import { clampScroll } from '@/features/piano-roll/utils/viewport/clampScroll';
import { tickToPixel } from '@/features/piano-roll/utils/coordinates/tickToPixel';

export function scrollForPlayhead(
    tick: number,
    view: Pick<PianoRollView, 'pixelsPerTick' | 'scrollOffsetX'>,
    width: number,
    endTick: number,
): number {
    const x = tickToPixel(tick, view.pixelsPerTick, view.scrollOffsetX);
    if (x >= 0 && x < width - 8) return view.scrollOffsetX;
    return clampScroll(
        tick * view.pixelsPerTick - width * 0.15,
        endTick,
        view.pixelsPerTick,
        width,
    );
}
