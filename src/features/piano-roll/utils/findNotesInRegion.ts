import type { Note, NoteRegion } from '@/features/piano-roll/types';

export function findNotesInRegion(notes: Record<string, Note>, region: NoteRegion): string[] {
    const startTick = Math.min(region.startTick, region.endTick);
    const endTick = Math.max(region.startTick, region.endTick);
    const lowestPitch = Math.min(region.lowestPitch, region.highestPitch);
    const highestPitch = Math.max(region.lowestPitch, region.highestPitch);
    if (startTick === endTick) return [];

    return Object.values(notes).filter(note =>
        note.startTick < endTick && note.startTick + note.durationTicks > startTick &&
        note.pitch >= lowestPitch && note.pitch <= highestPitch
    ).map(note => note.id);
}
