import { beforeEach, expect, test, vi } from 'vitest';
import type { Note } from '@/features/piano-roll/types';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import {
    executeNoteCommand,
    stepNoteHistory,
} from '@/features/piano-roll/store/noteHistory';
import {
    createAddNotesCommand,
    createDeleteNotesCommand,
    createMoveNotesCommand,
    createResizeNotesCommand,
} from '@/features/piano-roll/store/commands/createNoteCommand';
import { applyNoteCommand } from '@/features/piano-roll/store/commands/applyNoteCommand';

function note(id: string, selected = false): Note {
    return {
        id,
        pitch: 60,
        startTick: 120,
        durationTicks: 240,
        velocity: 75,
        selected,
    };
}

function seed() {
    useNoteStore.setState({
        notes: { a: note('a', true), b: note('b', true), c: note('c') },
    });
    return useNoteStore.getState();
}

beforeEach(() => useNoteStore.setState(useNoteStore.getInitialState()));

test('empty history and null commands preserve state identity without publishing', () => {
    const state = useNoteStore.getState();
    const subscriber = vi.fn();
    const unsubscribe = useNoteStore.subscribe(subscriber);
    expect(state.undo()).toBeNull();
    expect(state.redo()).toBeNull();
    expect(executeNoteCommand(state, null)).toBe(state);
    expect(stepNoteHistory(state, 'undo')).toBe(state);
    expect(stepNoteHistory(state, 'redo')).toBe(state);
    expect(useNoteStore.getState()).toBe(state);
    unsubscribe();
    expect(subscriber).not.toHaveBeenCalled();
});

test('add, undo and redo preserve identity, musical values, and before/after selection', () => {
    const store = seed();
    const original = store.notes;
    const added = note('new', true);
    store.addNote(added, true);
    const after = useNoteStore.getState().notes;
    expect(after.a.selected).toBe(false);
    expect(after.new).toEqual(added);
    expect(useNoteStore.getState().undoStack).toHaveLength(1);
    added.velocity = 1; // The command must own its payload, independently of its caller.
    store.selectNotes(['c']);
    expect(store.undo()?.type).toBe('ADD_NOTE');
    expect(useNoteStore.getState().notes).toEqual(original);
    expect(useNoteStore.getState().undoStack).toHaveLength(0);
    expect(useNoteStore.getState().redoStack).toHaveLength(1);
    store.selectNotes(['b']);
    expect(store.redo()?.type).toBe('ADD_NOTE');
    expect(useNoteStore.getState().notes).toEqual(after);
    expect(useNoteStore.getState().notes.new.velocity).toBe(75);
});

test('undo and redo apply multiple operations in reverse and forward order', () => {
    const store = seed();
    const original = store.notes;
    store.moveNotes([
        { id: 'a', startTick: 360, pitch: 65 },
        { id: 'b', startTick: 480, pitch: 67 },
    ]);
    const moved = useNoteStore.getState().notes;
    store.resizeNotes([
        { id: 'a', durationTicks: 480 },
        { id: 'b', durationTicks: 600 },
    ]);
    const resized = useNoteStore.getState().notes;
    store.deleteNotes(['a', 'b']);
    const deleted = useNoteStore.getState().notes;
    expect(useNoteStore.getState().undoStack).toHaveLength(3);
    for (const expected of [resized, moved, original]) {
        store.undo();
        expect(useNoteStore.getState().notes).toEqual(expected);
    }
    for (const expected of [moved, resized, deleted]) {
        store.redo();
        expect(useNoteStore.getState().notes).toEqual(expected);
    }
    expect(useNoteStore.getState().redoStack).toHaveLength(0);
});

test.each(['move', 'resize', 'delete', 'paste'] as const)(
    '%s, undo, and redo each publish one group update',
    (operation) => {
        const store = seed();
        const original = store.notes;
        const subscriber = vi.fn();
        const unsubscribe = useNoteStore.subscribe(subscriber);
        switch (operation) {
            case 'move':
                store.moveNotes([
                    { id: 'a', startTick: 480, pitch: 70 },
                    { id: 'b', startTick: 600, pitch: 72 },
                ]);
                break;
            case 'resize':
                store.resizeNotes([
                    { id: 'a', durationTicks: 360 },
                    { id: 'b', durationTicks: 480 },
                ]);
                break;
            case 'delete':
                store.deleteNotes(['a', 'b', 'a', 'missing']);
                break;
            case 'paste':
                store.pasteNotes([note('pasted-a'), note('pasted-b')]);
                break;
        }
        const after = useNoteStore.getState().notes;
        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(useNoteStore.getState().undoStack).toHaveLength(1);
        subscriber.mockClear();
        store.undo();
        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(useNoteStore.getState().notes).toEqual(original);
        expect(useNoteStore.getState().notes.c).toBe(original.c);
        store.redo();
        expect(subscriber).toHaveBeenCalledTimes(2);
        expect(useNoteStore.getState().notes).toEqual(after);
        expect(useNoteStore.getState().notes.c).toBe(original.c);
        unsubscribe();
    },
);

test.each([
    { ids: ['a'] },
    { ids: ['c'] },
    { ids: ['b', 'd'] },
    { ids: ['a', 'b', 'c', 'd'] },
])('undoing deletion restores insertion/drawing order for $ids', ({ ids }) => {
    const notes = Object.fromEntries(
        ['a', 'b', 'c', 'd'].map((id) => [id, note(id)]),
    );
    const command = createDeleteNotesCommand(notes, ids);
    expect(command).not.toBeNull();
    if (!command) throw new Error('Expected deletion');
    const remaining = applyNoteCommand(notes, command, 'do');
    const restored = applyNoteCommand(remaining, command, 'undo');
    expect(Object.keys(restored)).toEqual(Object.keys(notes));
    expect(restored).toEqual(notes);
    expect(notes).toHaveProperty('a');
});

test('selection, unknown targets, unchanged edits, and rejected pastes leave redo available', () => {
    const store = seed();
    store.moveNote('a', 480, 70);
    store.undo();
    const redo = useNoteStore.getState().redoStack;
    store.selectNote('c');
    expect(useNoteStore.getState().redoStack).toBe(redo);
    const before = useNoteStore.getState();
    store.addNote(note('a'));
    store.moveNotes([
        { id: 'a', startTick: 120, pitch: 60 },
        { id: 'missing', startTick: 0, pitch: 0 },
    ]);
    store.resizeNotes([
        { id: 'a', durationTicks: 240 },
        { id: 'b', durationTicks: 0 },
    ]);
    store.deleteNotes(['missing']);
    store.pasteNotes([]);
    store.pasteNotes([note('new'), note('new')]);
    store.pasteNotes([note('new'), note('a')]);
    expect(useNoteStore.getState()).toBe(before);
    store.toggleNoteSelection('b');
    expect(useNoteStore.getState().undoStack).toHaveLength(0);
    expect(useNoteStore.getState().redoStack).toBe(redo);
    store.redo();
    expect(useNoteStore.getState().notes.a).toMatchObject({
        startTick: 480,
        pitch: 70,
        selected: true,
    });
    expect(useNoteStore.getState().notes.c.selected).toBe(false);
});

test.each(['add', 'move', 'resize', 'delete', 'paste'] as const)(
    'a new %s clears the abandoned redo branch',
    (operation) => {
        const store = seed();
        store.moveNote('a', 480, 70);
        store.undo();
        switch (operation) {
            case 'add':
                store.addNote(note('new'));
                break;
            case 'move':
                store.moveNote('b', 360, 62);
                break;
            case 'resize':
                store.resizeNote('b', 360);
                break;
            case 'delete':
                store.deleteNote('b');
                break;
            case 'paste':
                store.pasteNotes([note('new')]);
                break;
        }
        expect(useNoteStore.getState().redoStack).toHaveLength(0);
        expect(store.redo()).toBeNull();
        store.undo();
        expect(useNoteStore.getState().notes.a).toEqual(note('a', true));
    },
);

test('command factories retain field deltas and detach mutable arguments', () => {
    const store = seed();
    const position = { id: 'a', startTick: 480, pitch: 72 };
    const duration = { id: 'b', durationTicks: 360 };
    const move = createMoveNotesCommand(store.notes, [position]);
    const resize = createResizeNotesCommand(store.notes, [duration]);
    const added = createAddNotesCommand(store.notes, [note('new')], 'ADD_NOTE');
    expect(move).toMatchObject({
        changes: [
            {
                id: 'a',
                from: { startTick: 120, pitch: 60 },
                to: { startTick: 480, pitch: 72 },
            },
        ],
    });
    expect(resize).toMatchObject({
        changes: [
            {
                id: 'b',
                from: { durationTicks: 240 },
                to: { durationTicks: 360 },
            },
        ],
    });
    position.pitch = 1;
    duration.durationTicks = 1;
    if (!move || !resize || !added) throw new Error('Expected commands');
    const moved = applyNoteCommand(store.notes, move, 'do');
    const resized = applyNoteCommand(store.notes, resize, 'do');
    expect(moved.a.pitch).toBe(72);
    expect(resized.b.durationTicks).toBe(360);
    expect(moved.c).toBe(store.notes.c);
    expect(store.notes.a.startTick).toBe(120);
    const executed = executeNoteCommand(store, added);
    const undone = stepNoteHistory(executed, 'undo');
    expect(undone.notes).toEqual(store.notes);
    expect(stepNoteHistory(undone, 'redo').notes).toEqual(executed.notes);
});
