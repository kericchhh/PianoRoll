import { expect, test } from 'vitest';
import { findNoteAt } from '@/features/piano-roll/utils/notes/findNoteAt';
import type { Note } from '@/features/piano-roll/types';

const first: Note = {
    id: 'first',
    pitch: 60,
    startTick: 120,
    durationTicks: 240,
    velocity: 100,
    selected: false,
};

test.each([
    [120, 60, 'first'],
    [359.99, 60, 'first'],
    [119.99, 60, undefined],
    [360, 60, undefined],
    [180, 61, undefined],
] as const)(
    'finds the note at tick %s and pitch %s',
    (tick, pitch, expectedId) => {
        expect(findNoteAt({ first }, tick, pitch)?.id).toBe(expectedId);
    },
);

test('returns the last-drawn note when notes overlap', () => {
    const top: Note = {
        ...first,
        id: 'top',
        startTick: 180,
        durationTicks: 120,
    };
    expect(findNoteAt({ first, top }, 200, 60)?.id).toBe('top');
    expect(findNoteAt({ first, top }, 130, 60)?.id).toBe('first');
});
