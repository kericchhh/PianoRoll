import type { Note } from '@/features/piano-roll/types';

export function moveNoteGroup(
    notes: readonly Note[],
    tickDelta: number,
    pitchDelta: number,
    endTick: number,
): readonly Note[] {
    if (notes.length === 0) return notes;

    let earliestStart = Infinity;
    let latestEnd = -Infinity;
    let lowestPitch = 127;
    let highestPitch = 0;
    for (const note of notes) {
        earliestStart = Math.min(earliestStart, note.startTick);
        latestEnd = Math.max(latestEnd, note.startTick + note.durationTicks);
        lowestPitch = Math.min(lowestPitch, note.pitch);
        highestPitch = Math.max(highestPitch, note.pitch);
    }

    const boundedTickDelta = Math.max(
        -earliestStart,
        Math.min(Math.max(0, endTick - latestEnd), tickDelta),
    );
    const boundedPitchDelta = Math.max(
        -lowestPitch,
        Math.min(127 - highestPitch, pitchDelta),
    );
    if (boundedTickDelta === 0 && boundedPitchDelta === 0) return notes;

    return notes.map((note) => ({
        ...note,
        startTick: note.startTick + boundedTickDelta,
        pitch: note.pitch + boundedPitchDelta,
    }));
}
