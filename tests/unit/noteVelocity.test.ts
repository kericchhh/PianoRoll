import { beforeEach, expect, test, vi } from 'vitest';
import type { Note } from '@/features/piano-roll/types';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { createVelocityCommand } from '@/features/piano-roll/store/commands/createNoteCommand';
import { applyNoteCommand } from '@/features/piano-roll/store/commands/applyNoteCommand';

const original: Note = {
    id: 'a',
    pitch: 72,
    startTick: 80003,
    durationTicks: 1,
    velocity: 80,
    selected: false,
};
const selected: Note = {
    id: 'b',
    pitch: 60,
    startTick: 120,
    durationTicks: 240,
    velocity: 100,
    selected: true,
};

beforeEach(() => {
    useNoteStore.setState(useNoteStore.getInitialState());
    useNoteStore.setState({ notes: { a: original, b: selected } });
});

test.each([0, 1, 126, 127])(
    'setting velocity to %i publishes one edit and changes no other note fields or selection',
    (velocity) => {
        const before = useNoteStore.getState();
        const changes = vi.fn();
        const unsubscribe = useNoteStore.subscribe(changes);

        before.setNoteVelocity('a', velocity);
        unsubscribe();

        const after = useNoteStore.getState();
        expect(changes).toHaveBeenCalledOnce();
        expect(after.notes.a).toEqual({ ...original, velocity });
        expect(after.notes.b).toBe(before.notes.b);
        expect(before.notes.a).toEqual(original);
        expect(after.undoStack).toHaveLength(1);
        expect(after.undoStack[0].type).toBe('SET_VELOCITY');
        expect(after.redoStack).toEqual([]);
    },
);

test('velocity edit, undo and redo each publish once and restore the edit selection while retaining all musical fields', () => {
    const store = useNoteStore.getState();
    const before = store.notes;
    const changes = vi.fn();
    const unsubscribe = useNoteStore.subscribe(changes);
    store.setNoteVelocity('a', 0);
    expect(changes).toHaveBeenCalledOnce();
    const edited = useNoteStore.getState().notes;
    store.selectNotes(['a']);
    changes.mockClear();

    expect(store.undo()?.type).toBe('SET_VELOCITY');
    expect(changes).toHaveBeenCalledOnce();
    expect(useNoteStore.getState().notes).toEqual(before);
    expect(useNoteStore.getState().undoStack).toEqual([]);
    expect(useNoteStore.getState().redoStack).toHaveLength(1);

    store.selectNotes([]);
    changes.mockClear();
    expect(store.redo()?.type).toBe('SET_VELOCITY');
    expect(changes).toHaveBeenCalledOnce();
    expect(useNoteStore.getState().notes).toEqual(edited);
    expect(useNoteStore.getState().notes.a.selected).toBe(false);
    expect(useNoteStore.getState().notes.b.selected).toBe(true);
    expect(useNoteStore.getState().notes.a.velocity).toBe(0);
    unsubscribe();
});

test.each([-1, 128, 0.5, 126.5, NaN, Infinity, -Infinity])(
    'invalid velocity %s leaves notes, selection and both history stacks untouched',
    (velocity) => {
        const store = useNoteStore.getState();
        store.moveNote('b', 240, 61);
        store.undo();
        const before = useNoteStore.getState();
        const changes = vi.fn();
        const unsubscribe = useNoteStore.subscribe(changes);

        store.setNoteVelocity('a', velocity);
        unsubscribe();

        expect(useNoteStore.getState()).toBe(before);
        expect(changes).not.toHaveBeenCalled();
    },
);

test('missing notes and unchanged velocities preserve redo without publishing an edit', () => {
    const store = useNoteStore.getState();
    store.setNoteVelocity('a', 90);
    store.undo();
    const before = useNoteStore.getState();
    const changes = vi.fn();
    const unsubscribe = useNoteStore.subscribe(changes);
    store.setNoteVelocity('missing', 127);
    store.setNoteVelocity('a', 80);
    unsubscribe();
    expect(useNoteStore.getState()).toBe(before);
    expect(before.redoStack).toHaveLength(1);
    expect(changes).not.toHaveBeenCalled();
    store.redo();
    expect(useNoteStore.getState().notes.a.velocity).toBe(90);
});

test('a new velocity edit clears redo and retains the rest of the command history', () => {
    const store = useNoteStore.getState();
    store.moveNote('b', 240, 61);
    store.resizeNote('b', 360);
    store.undo();
    expect(useNoteStore.getState().redoStack).toHaveLength(1);
    store.setNoteVelocity('a', 127);
    expect(useNoteStore.getState().redoStack).toEqual([]);
    expect(
        useNoteStore.getState().undoStack.map((command) => command.type),
    ).toEqual(['MOVE_NOTES', 'SET_VELOCITY']);
    store.undo();
    expect(useNoteStore.getState().notes.a).toEqual(original);
    expect(useNoteStore.getState().notes.b).toEqual({
        ...selected,
        startTick: 240,
        pitch: 61,
    });
});

test('velocity commands retain a field delta independently of later source note mutations', () => {
    const source = { a: { ...original }, b: { ...selected } };
    const command = createVelocityCommand(source, 'a', 0);
    expect(command?.type).toBe('SET_VELOCITY');
    if (!command) throw new Error('Expected a velocity command');
    source.a.velocity = 1;
    const edited = applyNoteCommand(source, command, 'do');
    expect(edited.a).toEqual({ ...original, velocity: 0 });
    expect(edited.b).toBe(source.b);
    const movedAfterEdit = {
        ...edited,
        a: { ...edited.a, startTick: 120, pitch: 50 },
    };
    const restored = applyNoteCommand(movedAfterEdit, command, 'undo');
    expect(restored.a).toEqual({ ...original, startTick: 120, pitch: 50 });
    expect(source.a.velocity).toBe(1);
});

test('velocity factory rejects absent targets, unchanged values and invalid values before creating history', () => {
    const notes = useNoteStore.getState().notes;
    expect(createVelocityCommand(notes, 'missing', 0)).toBeNull();
    expect(createVelocityCommand(notes, 'a', original.velocity)).toBeNull();
    for (const velocity of [-1, 128, 0.5, NaN, Infinity]) {
        expect(createVelocityCommand(notes, 'a', velocity)).toBeNull();
    }
});
