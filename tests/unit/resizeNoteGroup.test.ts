import { expect, test } from 'vitest';
import type { Note } from '@/features/piano-roll/types';
import { resizeNoteGroup } from '@/features/piano-roll/utils/resizeNoteGroup';

const notes: Note[] = [
  {
    id: 'a',
    pitch: 60,
    startTick: 120,
    durationTicks: 120,
    velocity: 100,
    selected: true,
  },
  {
    id: 'b',
    pitch: 64,
    startTick: 360,
    durationTicks: 240,
    velocity: 90,
    selected: true,
  },
];

test('applies one duration delta while preserving every other field and the originals', () => {
  const resized = resizeNoteGroup(notes, 120, 960);

  expect(resized).toEqual([
    { ...notes[0], durationTicks: 240 },
    { ...notes[1], durationTicks: 360 },
  ]);
  expect(notes.map((note) => note.durationTicks)).toEqual([120, 240]);
});

test('the earliest endpoint limit stops the entire group together', () => {
  const resized = resizeNoteGroup(notes, 1000, 960);

  expect(resized.map((note) => note.durationTicks)).toEqual([480, 600]);
  expect(resized[1].startTick + resized[1].durationTicks).toBe(960);
});

test('the shortest note stops all selected notes at the 120-tick minimum', () => {
  const group = notes.map((note) => ({
    ...note,
    durationTicks: note.durationTicks + 120,
  }));
  const resized = resizeNoteGroup(group, -1000, 960);

  expect(resized.map((note) => note.durationTicks)).toEqual([120, 240]);
  expect(resizeNoteGroup(notes, -120, 960)).toBe(notes);
});

test('zero, bounded and empty changes preserve the original array reference', () => {
  expect(resizeNoteGroup(notes, 0, 960)).toBe(notes);
  expect(resizeNoteGroup(notes, 120, 600)).toBe(notes);
  const empty: Note[] = [];
  expect(resizeNoteGroup(empty, 120, 960)).toBe(empty);
});

test('shortening the timeline blocks extension without forcibly truncating notes', () => {
  const group = notes.map((note) => ({
    ...note,
    durationTicks: note.durationTicks + 120,
  }));

  expect(resizeNoteGroup(group, 120, 480)).toBe(group);
  const shortened = resizeNoteGroup(group, -120, 480);
  expect(shortened).toEqual(notes);
  expect(shortened[1].startTick + shortened[1].durationTicks).toBe(600);
});

test('a preexisting note below the minimum is not lengthened by a shortening request', () => {
  const short = [{ ...notes[0], durationTicks: 60 }];

  expect(resizeNoteGroup(short, -120, 960)).toBe(short);
  expect(resizeNoteGroup(short, 0, 960)).toBe(short);
});
