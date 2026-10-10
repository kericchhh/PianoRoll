import type { Note } from '@/features/piano-roll/types';

export function groupMidiNotes(notes: readonly Note[]): Note[][] {
    const groups: { notes: Note[]; ends: Map<number, number> }[] = [];
    const ordered = [...notes].sort((a, b) => a.startTick - b.startTick);
    for (const note of ordered) {
        let group = groups.find(
            ({ ends }) => (ends.get(note.pitch) ?? 0) <= note.startTick,
        );
        if (!group) {
            group = { notes: [], ends: new Map() };
            groups.push(group);
        }
        group.notes.push(note);
        group.ends.set(note.pitch, note.startTick + note.durationTicks);
    }
    return groups.map((group) => group.notes);
}
