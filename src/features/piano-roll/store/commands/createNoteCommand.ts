import type { Note } from '@/features/piano-roll/types';
import type { NoteCommand } from './types';
import { SNAP_TICKS } from '@/features/piano-roll/constants';
import { selectedNoteIds } from '@/features/piano-roll/store/noteSelection';

function unchangedSelection(notes: Record<string, Note>) {
    const ids = selectedNoteIds(notes);
    return { before: ids, after: ids };
}

export function createAddNotesCommand(
    current: Record<string, Note>,
    incoming: readonly Note[],
    type: 'ADD_NOTE' | 'PASTE_NOTES',
    selectAdded = false,
): NoteCommand | null {
    const ids = new Set(incoming.map((note) => note.id));
    if (
        incoming.length === 0 ||
        ids.size !== incoming.length ||
        incoming.some((note) => Object.hasOwn(current, note.id))
    )
        return null;
    const notes = incoming.map((note) => ({
        ...note,
        selected: selectAdded || note.selected,
    }));
    const before = selectedNoteIds(current);
    const addedSelection = notes
        .filter((note) => note.selected)
        .map((note) => note.id);
    return {
        type,
        notes,
        selection: {
            before,
            after: selectAdded
                ? addedSelection
                : [...before, ...addedSelection],
        },
    };
}

export function createDeleteNotesCommand(
    notes: Record<string, Note>,
    ids: readonly string[],
): NoteCommand | null {
    const removed = new Set(ids);
    const deleted = Object.values(notes).flatMap((note, index) =>
        removed.has(note.id) ? [{ note: { ...note }, index }] : [],
    );
    if (deleted.length === 0) return null;
    const before = selectedNoteIds(notes);
    return {
        type: 'DELETE_NOTES',
        deleted,
        selection: { before, after: before.filter((id) => !removed.has(id)) },
    };
}

export function createMoveNotesCommand(
    notes: Record<string, Note>,
    positions: readonly Pick<Note, 'id' | 'startTick' | 'pitch'>[],
): NoteCommand | null {
    const unique = new Map(
        positions.map((position) => [position.id, position]),
    );
    const changes = [...unique.values()].flatMap(({ id, startTick, pitch }) => {
        const note = notes[id];
        if (!note || (note.startTick === startTick && note.pitch === pitch))
            return [];
        return [
            {
                id,
                from: { startTick: note.startTick, pitch: note.pitch },
                to: { startTick, pitch },
            },
        ];
    });
    return changes.length === 0
        ? null
        : {
              type: 'MOVE_NOTES',
              changes,
              selection: unchangedSelection(notes),
          };
}

export function createResizeNotesCommand(
    notes: Record<string, Note>,
    durations: readonly Pick<Note, 'id' | 'durationTicks'>[],
): NoteCommand | null {
    const unique = new Map(
        durations.map((duration) => [duration.id, duration]),
    );
    const changes = [...unique.values()].flatMap(({ id, durationTicks }) => {
        const note = notes[id];
        if (
            !note ||
            !Number.isInteger(durationTicks) ||
            durationTicks < SNAP_TICKS ||
            note.durationTicks === durationTicks
        )
            return [];
        return [
            {
                id,
                from: { durationTicks: note.durationTicks },
                to: { durationTicks },
            },
        ];
    });
    return changes.length === 0
        ? null
        : {
              type: 'RESIZE_NOTES',
              changes,
              selection: unchangedSelection(notes),
          };
}
