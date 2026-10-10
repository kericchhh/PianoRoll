import type { Note } from '@/features/piano-roll/types';
import type { NoteCommand } from './types';
import { selectedNoteIds } from '@/features/piano-roll/store/noteSelection';

export function createImportNotesCommand(
    current: Record<string, Note>,
    incoming: readonly Note[],
): NoteCommand | null {
    if (incoming.length === 0 && Object.keys(current).length === 0) return null;
    const ids = new Set(incoming.map((note) => note.id));
    if (ids.size !== incoming.length) return null;
    const notes = incoming.map((note) => ({ ...note }));
    return {
        type: 'IMPORT_NOTES',
        removed: Object.values(current).map((note) => ({ ...note })),
        notes,
        selection: {
            before: selectedNoteIds(current),
            after: notes.filter((note) => note.selected).map((note) => note.id),
        },
    };
}
