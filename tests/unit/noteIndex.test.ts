import { expect, test } from 'vitest';
import {
  createNoteIndex,
  queryNoteIndex,
} from '@/features/piano-roll/utils/noteIndex';
import { findNotesInRegion } from '@/features/piano-roll/utils/findNotesInRegion';
import type { Note } from '@/features/piano-roll/types';

function note(
  id: string,
  startTick: number,
  durationTicks = 120,
  pitch = 72,
): Note {
  return {
    id,
    startTick,
    durationTicks,
    pitch,
    selected: false,
    velocity: 100,
  };
}
test('includes long notes that start outside the region and preserves drawing order', () => {
  const notes = {
    later: note('later', 960),
    span: note('span', 0, 2000),
    before: note('before', 120),
  };
  const index = createNoteIndex(notes);
  expect(
    queryNoteIndex(index, {
      startTick: 1000,
      endTick: 1200,
      lowestPitch: 72,
      highestPitch: 72,
    }).map((note) => note.id),
  ).toEqual(['later', 'span']);
  expect(notes.later.startTick).toBe(960);
});
test('matches linear overlap queries across 1000 notes, including pitch and time boundaries', () => {
  const notes = Object.fromEntries(
    Array.from({ length: 1000 }, (_, i) => {
      const current = note(
        String(i),
        i * 30,
        i % 17 === 0 ? 4000 : 120,
        i % 128,
      );
      return [current.id, current];
    }),
  );
  const index = createNoteIndex(notes);
  for (let startTick = 0; startTick < 30000; startTick += 600) {
    const region = {
      startTick,
      endTick: startTick + 1200,
      lowestPitch: 60,
      highestPitch: 72,
    };
    expect(queryNoteIndex(index, region).map((note) => note.id)).toEqual(
      findNotesInRegion(notes, region),
    );
  }
});
test('empty and zero-area queries return no candidates; selection is derived from source', () => {
  const index = createNoteIndex({
    a: { ...note('a', 0), selected: true },
    b: note('b', 120),
  });
  expect(index.selected.map((note) => note.id)).toEqual(['a']);
  expect(
    queryNoteIndex(index, {
      startTick: 120,
      endTick: 120,
      lowestPitch: 0,
      highestPitch: 127,
    }),
  ).toEqual([]);
  expect(
    queryNoteIndex(createNoteIndex({}), {
      startTick: 0,
      endTick: 120,
      lowestPitch: 0,
      highestPitch: 127,
    }),
  ).toEqual([]);
});
