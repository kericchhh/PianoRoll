import type { Note } from '@/features/piano-roll/types';

export function selectedNoteIds(notes: Record<string, Note>): string[] {
    return Object.values(notes)
        .filter((note) => note.selected)
        .map((note) => note.id);
}

export function selectNotesInRecord(
    current: Record<string, Note>,
    ids: readonly string[],
): Record<string, Note> {
    const selection = new Set(ids);
    let notes = current;
    for (const [id, note] of Object.entries(current)) {
        const selected = selection.has(id);
        if (note.selected === selected) continue;
        if (notes === current) notes = { ...current };
        notes[id] = { ...note, selected };
    }
    return notes;
}
