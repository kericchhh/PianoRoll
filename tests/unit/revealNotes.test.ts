import { expect, test } from 'vitest';
import { revealNotes } from '@/features/piano-roll/utils/revealNotes';
import type { Note, PianoRollView } from '@/features/piano-roll/types';

const view: PianoRollView = {
  pixelsPerTick: 0.5,
  scrollOffsetX: 0,
  highestVisiblePitch: 72,
  rowHeight: 20,
};
const note: Note = {
  id: 'a',
  startTick: 120,
  pitch: 72,
  durationTicks: 120,
  velocity: 100,
  selected: true,
};
const reveal = (notes: Note[], current = view) =>
  revealNotes(notes, current, 600, 240, 7680);

test('keeps visible notes in place and preserves an empty view', () => {
  expect(reveal([note])).toEqual(view);
  expect(reveal([])).toBe(view);
});
test('reveals high and low pitches without changing note data', () => {
  const high = { ...note, pitch: 73 };
  expect(reveal([high]).highestVisiblePitch).toBe(73);
  expect(reveal([{ ...note, pitch: 0 }]).highestVisiblePitch).toBe(11);
  expect(high.pitch).toBe(73);
});
test('reveals notes to the right and left and respects timeline bounds', () => {
  expect(reveal([{ ...note, startTick: 2400 }]).scrollOffsetX).toBe(660);
  expect(reveal([note], { ...view, scrollOffsetX: 600 }).scrollOffsetX).toBe(
    60,
  );
  expect(reveal([{ ...note, startTick: 7680 }]).scrollOffsetX).toBe(3240);
});
test('reveals a fitting group, or its anchor when the whole group cannot fit', () => {
  expect(
    reveal([note, { ...note, id: 'b', pitch: 61 }]).highestVisiblePitch,
  ).toBe(72);
  expect(
    reveal([
      { ...note, pitch: 100 },
      { ...note, id: 'b', pitch: 0 },
    ]).highestVisiblePitch,
  ).toBe(100);
  expect(
    reveal([
      { ...note, startTick: 2400 },
      { ...note, id: 'b', startTick: 0 },
    ]).scrollOffsetX,
  ).toBe(660);
});
