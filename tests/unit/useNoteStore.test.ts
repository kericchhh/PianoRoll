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
