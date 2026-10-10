import { beforeEach, expect, test } from 'vitest';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { Note } from '@/features/piano-roll/types';

const original: Note = {
    id: 'original',
    pitch: 60,
    startTick: 120,
    durationTicks: 240,
    velocity: 100,
    selected: true,
};
const imported: Note = {
    id: 'imported',
    pitch: 72,
    startTick: 7,
    durationTicks: 13,
    velocity: 70,
    selected: false,
};
beforeEach(() =>
    useNoteStore.setState({ notes: {}, undoStack: [], redoStack: [] }),
);

test('replaces all notes atomically and preserves selection, prior history and note order through undo/redo', () => {
    const store = useNoteStore.getState();
    store.addNote(original);
    store.addNote({ ...original, id: 'second', selected: false });
    const before = useNoteStore.getState().notes;
    let updates = 0;
    const unsubscribe = useNoteStore.subscribe(() => updates++);
    store.importNotes([imported]);
    unsubscribe();
    expect(updates).toBe(1);
    expect(useNoteStore.getState().notes).toEqual({ imported });
    expect(useNoteStore.getState().undoStack).toHaveLength(3);
    expect(store.undo()?.type).toBe('IMPORT_NOTES');
    expect(useNoteStore.getState().notes).toEqual(before);
    expect(Object.keys(useNoteStore.getState().notes)).toEqual([
        'original',
        'second',
    ]);
    store.redo();
    expect(useNoteStore.getState().notes).toEqual({ imported });
    store.undo();
    store.undo();
    expect(useNoteStore.getState().notes).toEqual({ original });
});

test('empty import removes existing notes reversibly but an empty-to-empty import creates no command', () => {
    const store = useNoteStore.getState();
    store.importNotes([]);
    expect(useNoteStore.getState().undoStack).toHaveLength(0);
    store.addNote(original);
    store.importNotes([]);
    expect(useNoteStore.getState().notes).toEqual({});
    store.undo();
    expect(useNoteStore.getState().notes).toEqual({ original });
});

test('an import clears redo and duplicate incoming IDs leave notes and history untouched', () => {
    const store = useNoteStore.getState();
    store.addNote(original);
    store.moveNote(original.id, 240, 61);
    store.undo();
    const before = useNoteStore.getState();
    store.importNotes([imported, imported]);
    expect(useNoteStore.getState()).toBe(before);
    store.importNotes([imported]);
    expect(useNoteStore.getState().redoStack).toHaveLength(0);
});
