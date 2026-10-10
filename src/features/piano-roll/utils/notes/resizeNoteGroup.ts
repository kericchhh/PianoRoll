import type { Note } from '@/features/piano-roll/types';
import { SNAP_TICKS } from '@/features/piano-roll/constants';

export function resizeNoteGroup(
    notes: readonly Note[],
    tickDelta: number,
    endTick: number,
): readonly Note[] {
    if (
        notes.length === 0 ||
        tickDelta === 0 ||
        !Number.isFinite(tickDelta) ||
        !Number.isFinite(endTick)
    )
        return notes;

    let minimumDelta = -Infinity;
    let maximumDelta = Infinity;
    for (const note of notes) {
        if (!Number.isInteger(note.durationTicks) || note.durationTicks <= 0)
            return notes;
        if (note.durationTicks < SNAP_TICKS && tickDelta < 0) return notes;
        minimumDelta = Math.max(minimumDelta, SNAP_TICKS - note.durationTicks);
        maximumDelta = Math.min(
            maximumDelta,
            Math.max(0, endTick - note.startTick - note.durationTicks),
        );
    }
    if (minimumDelta > maximumDelta) return notes;

    const boundedDelta = Math.max(
        minimumDelta,
        Math.min(maximumDelta, tickDelta),
    );
    if (boundedDelta === 0) return notes;

    return notes.map((note) => ({
        ...note,
        durationTicks: note.durationTicks + boundedDelta,
    }));
}
