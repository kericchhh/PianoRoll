import { expect, test } from 'vitest';
import { moveNoteGroup } from '@/features/piano-roll/utils/moveNoteGroup';
import type { Note } from '@/features/piano-roll/types';

const notes: Note[] = [
  { id: 'a', startTick: 120, pitch: 60, durationTicks: 120, velocity: 100, selected: true },
  { id: 'b', startTick: 360, pitch: 64, durationTicks: 240, velocity: 90, selected: true },
];

test('bounds the group together while preserving note spacing and chord intervals', () => {
  const moved = moveNoteGroup(notes, 1000, 100, 960);

  expect(moved[0]).toEqual({ ...notes[0], startTick: 480, pitch: 123 });
  expect(moved[1]).toEqual({ ...notes[1], startTick: 720, pitch: 127 });
  expect(notes[0]).toMatchObject({ startTick: 120, pitch: 60 });
  expect(notes[1]).toMatchObject({ startTick: 360, pitch: 64 });
});

test('stops the entire group at tick zero and the lowest MIDI pitch', () => {
  const moved = moveNoteGroup(notes, -1000, -100, 960);

  expect(moved[0]).toMatchObject({ startTick: 0, pitch: 0 });
  expect(moved[1]).toMatchObject({ startTick: 240, pitch: 4 });
});

test('unchanged and empty groups return their original references', () => {
  expect(moveNoteGroup(notes, 0, 0, 960)).toBe(notes);
  const empty: Note[] = [];
  expect(moveNoteGroup(empty, 120, 1, 960)).toBe(empty);
});

test('pitch-only movement does not relocate notes outside a shortened timeline', () => {
  const moved = moveNoteGroup(notes, 0, 1, 480);

  expect(moved[0]).toMatchObject({ startTick: 120, pitch: 61 });
  expect(moved[1]).toMatchObject({ startTick: 360, pitch: 65 });
  expect(moveNoteGroup(notes, 120, 0, 480)).toBe(notes);
});
