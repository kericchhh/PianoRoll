import { expect, test } from 'vitest';
import { findNotesInRegion } from '@/features/piano-roll/utils/findNotesInRegion';
import type { Note, NoteRegion } from '@/features/piano-roll/types';

const region: NoteRegion = {
    startTick: 120,
    endTick: 360,
    lowestPitch: 60,
    highestPitch: 64,
};

function makeNote(
    id: string,
    startTick: number,
    durationTicks: number,
    pitch = 60,
): Note {
    return {
        id,
        startTick,
        durationTicks,
        pitch,
        velocity: 100,
        selected: false,
    };
}

function find(notes: Note[], bounds = region) {
    return findNotesInRegion(
        Object.fromEntries(notes.map((note) => [note.id, note])),
        bounds,
    );
}

test('finds notes whose durations overlap the region, including notes starting outside it', () => {
    expect(
        find([
            makeNote('crosses-left', 0, 240),
            makeNote('inside', 120, 120),
            makeNote('crosses-right', 240, 240),
            makeNote('spans-region', 0, 480),
            makeNote('before', 0, 60),
            makeNote('after', 480, 120),
        ]),
    ).toEqual(['crosses-left', 'inside', 'crosses-right', 'spans-region']);
});

test('touching a time boundary without overlapping does not select a note', () => {
    expect(
        find([
            makeNote('ends-at-left', 0, 120),
            makeNote('starts-at-right', 360, 120),
        ]),
    ).toEqual([]);
});

test('includes both pitch boundaries but excludes pitches outside the region', () => {
    expect(
        find([
            makeNote('lowest', 120, 120, 60),
            makeNote('highest', 120, 120, 64),
            makeNote('below', 120, 120, 59),
            makeNote('above', 120, 120, 65),
        ]),
    ).toEqual(['lowest', 'highest']);
});

test('normalizes reversed time and pitch bounds', () => {
    expect(
        find([makeNote('inside', 120, 120, 62)], {
            startTick: 360,
            endTick: 120,
            lowestPitch: 64,
            highestPitch: 60,
        }),
    ).toEqual(['inside']);
});

test('empty notes and zero-width time regions have no hits', () => {
    expect(find([])).toEqual([]);
    expect(
        find([makeNote('spans', 0, 480)], {
            ...region,
            endTick: region.startTick,
        }),
    ).toEqual([]);
});
