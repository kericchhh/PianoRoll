import { beforeEach, expect, test } from 'vitest';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { Note } from '@/features/piano-roll/types';

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
    ...makeNote('a'), startTick: 480, pitch: 72,
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

test('batch movement publishes one update and preserves unrelated notes', () => {
  const store = useNoteStore.getState();
  store.addNote(makeNote('a'));
  store.addNote(makeNote('b'));
  store.addNote(makeNote('c'));
  const before = useNoteStore.getState().notes;
  const updates: typeof before[] = [];
  const unsubscribe = useNoteStore.subscribe(state => updates.push(state.notes));

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
