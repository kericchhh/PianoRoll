import type { Note } from '@/features/piano-roll/types';

export function getAudibleNotes(notes: readonly Note[]): Note[] {
    return notes.filter((note) => note.velocity > 0);
}

export function getPlaybackEndTick(notes: readonly Note[]): number {
    return notes.reduce(
        (endTick, note) =>
            Math.max(endTick, note.startTick + note.durationTicks),
        0,
    );
}

export function getPlaybackReleases(
    notes: readonly Note[],
): { pitch: number; endTick: number }[] {
    const ordered = getAudibleNotes(notes).sort(
        (a, b) => a.pitch - b.pitch || a.startTick - b.startTick,
    );
    const releases: { pitch: number; endTick: number }[] = [];
    for (const note of ordered) {
        const endTick = note.startTick + note.durationTicks;
        const previous = releases.at(-1);
        if (
            previous?.pitch === note.pitch &&
            note.startTick < previous.endTick
        ) {
            previous.endTick = Math.max(previous.endTick, endTick);
        } else {
            releases.push({ pitch: note.pitch, endTick });
        }
    }
    return releases;
}

export function getNotesToRetrigger(
    notes: readonly Note[],
    positionTick: number,
): Note[] {
    return getAudibleNotes(notes)
        .filter(
            (note) =>
                note.startTick < positionTick &&
                positionTick < note.startTick + note.durationTicks,
        )
        .map((note) => ({
            ...note,
            startTick: positionTick,
            durationTicks: note.startTick + note.durationTicks - positionTick,
        }));
}
