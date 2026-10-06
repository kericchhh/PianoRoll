import { beforeEach, expect, test, vi } from 'vitest';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { Note } from '@/features/piano-roll/types';
import {
    createNoteIndex,
    queryNoteIndex,
} from '@/features/piano-roll/utils/notes/noteIndex';

function makeNote(id: string): Note {
    return {
        id,
        pitch: 60,
        startTick: 120,
        durationTicks: 120,
        velocity: 100,
        selected: false,
    };
}

beforeEach(() => useNoteStore.setState({ notes: {} }));

test('pasting replaces selection and inserts the entire group in one immutable update', () => {
    const store = useNoteStore.getState();
    store.addNote({ ...makeNote('a'), selected: true });
    store.addNote(makeNote('b'));
    const before = useNoteStore.getState().notes;
    const pasted = [makeNote('c'), makeNote('d')];
    const updates = vi.fn();
    const unsubscribe = useNoteStore.subscribe(updates);

    store.pasteNotes(pasted);
    unsubscribe();

    const after = useNoteStore.getState().notes;
    expect(updates).toHaveBeenCalledTimes(1);
    expect(after.a).toEqual({ ...before.a, selected: false });
    expect(after.b).toBe(before.b);
    expect(after.c).toEqual({ ...pasted[0], selected: true });
    expect(after.d).toEqual({ ...pasted[1], selected: true });
    expect(after.c).not.toBe(pasted[0]);
    expect(pasted[0].selected).toBe(false);
    expect(before.a.selected).toBe(true);
    expect(
        queryNoteIndex(createNoteIndex(after), {
            startTick: 120,
            endTick: 240,
            lowestPitch: 60,
            highestPitch: 60,
        }).map((note) => note.id),
    ).toEqual(['a', 'b', 'c', 'd']);
});

test('empty pastes and duplicate or existing IDs are rejected without changing selection', () => {
    const store = useNoteStore.getState();
    store.addNote({ ...makeNote('a'), selected: true });
    const before = useNoteStore.getState();
    const updates = vi.fn();
    const unsubscribe = useNoteStore.subscribe(updates);
    for (const pasted of [
        [],
        [makeNote('b'), makeNote('b')],
        [makeNote('b'), makeNote('a')],
    ]) {
        store.pasteNotes(pasted);
        expect(useNoteStore.getState()).toBe(before);
    }
    unsubscribe();
    expect(updates).not.toHaveBeenCalled();
});

test('selects one note and deselects the previous selection', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.addNote(makeNote('b'));

    const beforeSelection = useNoteStore.getState().notes;
    store.selectNote('a');
    const afterFirstSelection = useNoteStore.getState().notes;
    expect(afterFirstSelection.a.selected).toBe(true);
    expect(afterFirstSelection.b.selected).toBe(false);
    expect(beforeSelection.a.selected).toBe(false);
    expect(afterFirstSelection.a).not.toBe(beforeSelection.a);
    expect(afterFirstSelection.b).toBe(beforeSelection.b);

    store.selectNote('b');
    const afterSecondSelection = useNoteStore.getState().notes;
    expect(afterSecondSelection.a.selected).toBe(false);
    expect(afterSecondSelection.b.selected).toBe(true);
});

test('ignores an unknown note ID without changing state', () => {
    useNoteStore.getState().addNote(makeNote('a'));
    const before = useNoteStore.getState();

    before.selectNote('missing');

    expect(useNoteStore.getState()).toBe(before);
});

test('deletes only the requested note', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.addNote(makeNote('b'));

    store.deleteNote('a');

    expect(useNoteStore.getState().notes.a).toBeUndefined();
    expect(useNoteStore.getState().notes.b).toEqual(makeNote('b'));
});

test('ignores deletion of an unknown note ID without changing state', () => {
    useNoteStore.getState().addNote(makeNote('a'));
    const before = useNoteStore.getState();

    before.deleteNote('missing');

    expect(useNoteStore.getState()).toBe(before);
});

test('moves only the requested note while preserving its other fields', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.addNote(makeNote('b'));
    const before = useNoteStore.getState().notes;

    store.moveNote('a', 480, 72);

    expect(useNoteStore.getState().notes.a).toEqual({
        ...makeNote('a'),
        startTick: 480,
        pitch: 72,
    });
    expect(useNoteStore.getState().notes.b).toBe(before.b);
    expect(before.a).toEqual(makeNote('a'));
});

test('ignores unknown or unchanged note moves', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    const before = useNoteStore.getState();

    store.moveNote('missing', 480, 72);
    expect(useNoteStore.getState()).toBe(before);
    store.moveNote('a', 120, 60);
    expect(useNoteStore.getState()).toBe(before);
});

test('toggles one selection without deselecting the other notes', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.addNote(makeNote('b'));
    store.selectNote('a');
    const before = useNoteStore.getState().notes;

    store.toggleNoteSelection('b');
    expect(useNoteStore.getState().notes.a).toBe(before.a);
    expect(useNoteStore.getState().notes.b.selected).toBe(true);
    expect(before.b.selected).toBe(false);

    store.toggleNoteSelection('a');
    expect(useNoteStore.getState().notes.a.selected).toBe(false);
    expect(useNoteStore.getState().notes.b.selected).toBe(true);
});

test('unknown selection toggles are a no-op', () => {
    const before = useNoteStore.getState();
    before.toggleNoteSelection('missing');
    expect(useNoteStore.getState()).toBe(before);
});

test('batch selection replaces the selected set in one update without mutating notes', () => {
    const store = useNoteStore.getState();
    for (const id of ['a', 'b', 'c', 'd']) store.addNote(makeNote(id));
    store.selectNote('c');
    const before = useNoteStore.getState().notes;
    const updates: (typeof before)[] = [];
    const unsubscribe = useNoteStore.subscribe((state) =>
        updates.push(state.notes),
    );

    store.selectNotes(['a', 'b', 'a', 'missing']);
    unsubscribe();

    expect(updates).toHaveLength(1);
    expect(updates[0].a.selected).toBe(true);
    expect(updates[0].b.selected).toBe(true);
    expect(updates[0].c.selected).toBe(false);
    expect(updates[0].d).toBe(before.d);
    expect(before.a.selected).toBe(false);
    expect(before.c.selected).toBe(true);
});

test('an empty batch clears selection while an unchanged batch preserves state identity', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.addNote(makeNote('b'));
    store.selectNotes(['a', 'b']);
    const selected = useNoteStore.getState();

    store.selectNotes(['b', 'a', 'a', 'missing']);
    expect(useNoteStore.getState()).toBe(selected);

    store.selectNotes([]);
    const cleared = useNoteStore.getState();
    expect(Object.values(cleared.notes).every((note) => !note.selected)).toBe(
        true,
    );
    store.selectNotes([]);
    expect(useNoteStore.getState()).toBe(cleared);
});

test('batch movement publishes one update and preserves unrelated notes', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.addNote(makeNote('b'));
    store.addNote(makeNote('c'));
    const before = useNoteStore.getState().notes;
    const updates: (typeof before)[] = [];
    const unsubscribe = useNoteStore.subscribe((state) =>
        updates.push(state.notes),
    );

    store.moveNotes([
        { id: 'a', startTick: 240, pitch: 61 },
        { id: 'b', startTick: 480, pitch: 65 },
    ]);
    unsubscribe();

    expect(updates).toHaveLength(1);
    expect(updates[0].a).toMatchObject({ startTick: 240, pitch: 61 });
    expect(updates[0].b).toMatchObject({ startTick: 480, pitch: 65 });
    expect(updates[0].c).toBe(before.c);
    expect(before.a).toEqual(makeNote('a'));
});

test('batch deletion removes only its targets and ignores duplicate or unknown IDs', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.addNote(makeNote('b'));
    store.addNote(makeNote('c'));
    const before = useNoteStore.getState().notes;

    store.deleteNotes(['a', 'b', 'a', 'missing']);

    expect(useNoteStore.getState().notes).toEqual({ c: before.c });
    expect(before.a).toBeDefined();
    expect(before.b).toBeDefined();
    const after = useNoteStore.getState();
    store.deleteNotes(['missing']);
    store.moveNotes([{ id: 'missing', startTick: 0, pitch: 0 }]);
    expect(useNoteStore.getState()).toBe(after);
});

test('resizing changes only duration and preserves unrelated note references', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.addNote(makeNote('b'));
    const before = useNoteStore.getState().notes;

    store.resizeNote('a', 360);

    expect(useNoteStore.getState().notes.a).toEqual({
        ...makeNote('a'),
        durationTicks: 360,
    });
    expect(useNoteStore.getState().notes.b).toBe(before.b);
    expect(before.a.durationTicks).toBe(120);
});

test('unknown or unchanged duration edits preserve the state and notes references', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    const before = useNoteStore.getState();
    const updates = vi.fn();
    const unsubscribe = useNoteStore.subscribe(updates);

    store.resizeNote('missing', 240);
    store.resizeNote('a', 120);
    store.resizeNotes([
        { id: 'a', durationTicks: 120 },
        { id: 'missing', durationTicks: 240 },
    ]);
    store.resizeNotes([]);
    unsubscribe();

    expect(useNoteStore.getState()).toBe(before);
    expect(useNoteStore.getState().notes).toBe(before.notes);
    expect(updates).not.toHaveBeenCalled();
});

test('batch resizing publishes one update and preserves unmodified notes', () => {
    const store = useNoteStore.getState();
    for (const id of ['a', 'b', 'c']) store.addNote(makeNote(id));
    const before = useNoteStore.getState().notes;
    const updates: (typeof before)[] = [];
    const unsubscribe = useNoteStore.subscribe((state) =>
        updates.push(state.notes),
    );

    store.resizeNotes([
        { id: 'a', durationTicks: 240 },
        { id: 'b', durationTicks: 360 },
        { id: 'missing', durationTicks: 480 },
    ]);
    unsubscribe();

    expect(updates).toHaveLength(1);
    expect(updates[0].a).toEqual({ ...before.a, durationTicks: 240 });
    expect(updates[0].b).toEqual({ ...before.b, durationTicks: 360 });
    expect(updates[0].c).toBe(before.c);
    expect(before.a.durationTicks).toBe(120);
});

test('invalid duration updates cannot create zero, fractional or non-finite notes', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    const before = useNoteStore.getState();

    for (const duration of [0, -120, 119, 120.5, NaN, Infinity]) {
        store.resizeNote('a', duration);
        expect(useNoteStore.getState()).toBe(before);
    }
});

test('a changed duration can rebuild the note index and query the newly covered time', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    const region = {
        startTick: 300,
        endTick: 360,
        lowestPitch: 60,
        highestPitch: 60,
    };
    const before = createNoteIndex(useNoteStore.getState().notes);
    expect(queryNoteIndex(before, region)).toEqual([]);

    store.resizeNote('a', 360);
    const after = createNoteIndex(useNoteStore.getState().notes);

    expect(queryNoteIndex(after, region)).toEqual([
        useNoteStore.getState().notes.a,
    ]);
    expect(queryNoteIndex(before, region)).toEqual([]);
});
