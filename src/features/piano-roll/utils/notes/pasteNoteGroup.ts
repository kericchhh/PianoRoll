import type { Note } from '@/features/piano-roll/types';
import { SNAP_TICKS } from '@/features/piano-roll/constants';

export type CopiedNote = Pick<
    Note,
    'pitch' | 'startTick' | 'durationTicks' | 'velocity'
>;

export function pasteNoteGroup(
    copied: readonly CopiedNote[],
    targetTick: number,
    endTick: number,
): CopiedNote[] | null {
    if (!Number.isFinite(targetTick) || !Number.isFinite(endTick)) return null;
    if (copied.length === 0) return [];
    let firstTick = Infinity;
    let lastTick = -Infinity;
    for (const note of copied) {
        if (
            !Number.isFinite(note.startTick) ||
            !Number.isFinite(note.durationTicks) ||
            note.startTick < 0 ||
            note.durationTicks <= 0 ||
            !Number.isInteger(note.pitch) ||
            note.pitch < 0 ||
            note.pitch > 127 ||
            !Number.isInteger(note.velocity) ||
            note.velocity < 0 ||
            note.velocity > 127
        )
            return null;
        firstTick = Math.min(firstTick, note.startTick);
        lastTick = Math.max(lastTick, note.startTick + note.durationTicks);
    }
    const startTick =
        Math.ceil(Math.max(0, targetTick) / SNAP_TICKS) * SNAP_TICKS;
    if (startTick + lastTick - firstTick > endTick) return null;
    return copied.map((note) => ({
        pitch: note.pitch,
        startTick: startTick + note.startTick - firstTick,
        durationTicks: note.durationTicks,
        velocity: note.velocity,
    }));
}
