import type { Note, PianoRollView } from '@/features/piano-roll/types';
import { tickToPixel } from '@/features/piano-roll/utils/coordinates/tickToPixel';

export type VelocityBar = { note: Note; x: number; width: number };

export function layoutVelocityBars(
    notes: readonly Note[],
    view: PianoRollView,
    width: number,
): VelocityBar[] {
    const visible = notes
        .filter((note) => {
            const x = tickToPixel(
                note.startTick,
                view.pixelsPerTick,
                view.scrollOffsetX,
            );
            return x >= 0 && x < width;
        })
        .sort(
            (a, b) =>
                a.startTick - b.startTick ||
                a.pitch - b.pitch ||
                a.id.localeCompare(b.id),
        );
    const bars: VelocityBar[] = [];
    for (let first = 0; first < visible.length;) {
        let last = first + 1;
        while (
            last < visible.length &&
            visible[last].startTick === visible[first].startTick
        )
            last++;
        const x = tickToPixel(
            visible[first].startTick,
            view.pixelsPerTick,
            view.scrollOffsetX,
        );
        const nextX =
            last < visible.length
                ? tickToPixel(
                      visible[last].startTick,
                      view.pixelsPerTick,
                      view.scrollOffsetX,
                  )
                : width;
        const available = Math.max(0, Math.min(width - x, nextX - x));
        const step = Math.min(16, available / (last - first));
        const barWidth = Math.min(12, step);
        for (let index = first; index < last; index++) {
            bars.push({
                note: visible[index],
                x: x + (index - first) * step,
                width: barWidth,
            });
        }
        first = last;
    }
    return bars;
}
