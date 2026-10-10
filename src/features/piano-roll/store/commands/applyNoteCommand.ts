import type { Note } from '@/features/piano-roll/types';
import type { NoteCommand } from './types';
import { selectNotesInRecord } from '@/features/piano-roll/store/noteSelection';

function restoreDeletedNotes(
    current: Record<string, Note>,
    deleted: Extract<NoteCommand, { type: 'DELETE_NOTES' }>['deleted'],
): Record<string, Note> {
    const existing = Object.values(current);
    const restored: Note[] = [];
    let existingIndex = 0;
    let deletedIndex = 0;
    while (existingIndex < existing.length || deletedIndex < deleted.length) {
        const removed = deleted[deletedIndex];
        if (removed && removed.index === restored.length) {
            restored.push({ ...removed.note });
            deletedIndex++;
        } else {
            restored.push(existing[existingIndex++]);
        }
    }
    return Object.fromEntries(restored.map((note) => [note.id, note]));
}

export function applyNoteCommand(
    current: Record<string, Note>,
    command: NoteCommand,
    phase: 'do' | 'undo',
): Record<string, Note> {
    let notes = { ...current };
    switch (command.type) {
        case 'IMPORT_NOTES':
            notes = Object.fromEntries(
                (phase === 'do' ? command.notes : command.removed).map(
                    (note) => [note.id, { ...note }],
                ),
            );
            break;
        case 'ADD_NOTE':
        case 'PASTE_NOTES':
            for (const note of command.notes) {
                if (phase === 'do') notes[note.id] = { ...note };
                else delete notes[note.id];
            }
            break;
        case 'DELETE_NOTES':
            if (phase === 'undo')
                notes = restoreDeletedNotes(current, command.deleted);
            else for (const { note } of command.deleted) delete notes[note.id];
            break;
        case 'MOVE_NOTES':
        case 'RESIZE_NOTES':
            for (const change of command.changes) {
                if (!notes[change.id]) continue;
                notes[change.id] = {
                    ...notes[change.id],
                    ...(phase === 'do' ? change.to : change.from),
                };
            }
            break;
    }
    return selectNotesInRecord(
        notes,
        phase === 'do' ? command.selection.after : command.selection.before,
    );
}
