import { expect, test } from 'vitest';
import type { Note } from '@/features/piano-roll/types';
import {
    getNotesToRetrigger,
    getPlaybackEndTick,
    getPlaybackReleases,
} from '@/features/piano-roll/utils/notes/playbackNotes';

const base: Note = {
    id: 'held',
    pitch: 60,
    startTick: 120,
    durationTicks: 480,
    velocity: 100,
    selected: false,
};

test('an empty project ends at zero and has nothing to retrigger', () => {
    expect(getPlaybackEndTick([])).toBe(0);
    expect(getPlaybackReleases([])).toEqual([]);
    expect(getNotesToRetrigger([], 240)).toEqual([]);
});

test('overlapping same-pitch notes release at their latest endpoint', () => {
    const notes = [
        { ...base, id: 'later', startTick: 480, durationTicks: 720 },
        { ...base, id: 'nested', startTick: 240, durationTicks: 120 },
        base,
    ];
    const original = structuredClone(notes);
    expect(getPlaybackReleases(notes)).toEqual([{ pitch: 60, endTick: 1200 }]);
    expect(notes).toEqual(original);
});

test('touching and separated same-pitch notes keep separate releases', () => {
    expect(
        getPlaybackReleases([
            base,
            { ...base, startTick: 600, durationTicks: 120 },
            { ...base, startTick: 960, durationTicks: 120 },
        ]),
    ).toEqual([
        { pitch: 60, endTick: 600 },
        { pitch: 60, endTick: 720 },
        { pitch: 60, endTick: 1080 },
    ]);
});

test('a bridge between intervals keeps the pitch held through the entire overlap', () => {
    expect(
        getPlaybackReleases([
            { ...base, startTick: 0, durationTicks: 240 },
            { ...base, startTick: 360, durationTicks: 240 },
            { ...base, startTick: 120, durationTicks: 360 },
        ]),
    ).toEqual([{ pitch: 60, endTick: 600 }]);
});

test('different pitches release independently even when their notes overlap', () => {
    expect(
        getPlaybackReleases([
            { ...base, pitch: 64 },
            { ...base, durationTicks: 960 },
        ]),
    ).toEqual([
        { pitch: 60, endTick: 1080 },
        { pitch: 64, endTick: 600 },
    ]);
});

test('playback ends at the latest endpoint, including a long earlier note', () => {
    const notes = [
        { ...base, startTick: 0, durationTicks: 1920 },
        { ...base, id: 'later', startTick: 960, durationTicks: 120 },
    ];
    expect(getPlaybackEndTick(notes)).toBe(1920);
    expect(getPlaybackEndTick([...notes].reverse())).toBe(1920);
});

test.each([0, 120, 600, 720])(
    'does not retrigger a note at position %i outside its strict interior',
    (positionTick) => {
        expect(getNotesToRetrigger([base], positionTick)).toEqual([]);
    },
);

test('retriggers only the remaining duration without changing the original note', () => {
    const note = Object.freeze({ ...base });
    expect(getNotesToRetrigger([note], 240.5)).toEqual([
        { ...base, startTick: 240.5, durationTicks: 359.5 },
    ]);
    expect(note).toEqual(base);
    expect(getNotesToRetrigger([note], 480)).toEqual([
        { ...base, startTick: 480, durationTicks: 120 },
    ]);
});

test('preserves overlapping voices, their velocities, and pitches', () => {
    const notes: Note[] = [
        base,
        { ...base, id: 'same-pitch', startTick: 0, velocity: 50 },
        { ...base, id: 'chord', pitch: 64, durationTicks: 960 },
        { ...base, id: 'ended', startTick: 0, durationTicks: 240 },
        { ...base, id: 'next', startTick: 240 },
    ];
    expect(getNotesToRetrigger(notes, 240)).toEqual([
        { ...base, startTick: 240, durationTicks: 360 },
        { ...notes[1], startTick: 240, durationTicks: 240 },
        { ...notes[2], startTick: 240, durationTicks: 840 },
    ]);
});
