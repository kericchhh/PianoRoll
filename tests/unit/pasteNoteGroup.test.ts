import { expect, test } from 'vitest';
import {
    pasteNoteGroup,
    type CopiedNote,
} from '@/features/piano-roll/utils/notes/pasteNoteGroup';

const copied: readonly CopiedNote[] = [
    { pitch: 64, startTick: 390, durationTicks: 240, velocity: 127 },
    { pitch: 60, startTick: 120, durationTicks: 360, velocity: 70 },
];

test('pasting preserves musical fields and offsets without changing the source', () => {
    const before = structuredClone(copied);
    const pasted = pasteNoteGroup(copied, 630, 1920);

    expect(pasted).toEqual([
        { pitch: 64, startTick: 990, durationTicks: 240, velocity: 127 },
        { pitch: 60, startTick: 720, durationTicks: 360, velocity: 70 },
    ]);
    expect(copied).toEqual(before);
    expect(pasted?.[0]).not.toBe(copied[0]);
});

test('a snapped target has no extra gap and a negative target starts at zero', () => {
    expect(pasteNoteGroup(copied, 600, 1920)?.[1].startTick).toBe(600);
    expect(pasteNoteGroup(copied, -120, 1920)?.[1].startTick).toBe(0);
});

test('the whole group may fit exactly at the timeline endpoint', () => {
    expect(pasteNoteGroup(copied, 630, 1230)).not.toBeNull();
    expect(pasteNoteGroup(copied, 630, 1229)).toBeNull();
    expect(pasteNoteGroup(copied, 0, 509)).toBeNull();
});

test('only the group origin snaps, including when internal offsets are off-grid', () => {
    const pasted = pasteNoteGroup(copied, 631, 1920);
    expect(pasted?.map((note) => note.startTick)).toEqual([990, 720]);
});

test.each([NaN, Infinity, -Infinity])(
    'rejects a non-finite target or endpoint (%s)',
    (value) => {
        expect(pasteNoteGroup(copied, value, 1920)).toBeNull();
        expect(pasteNoteGroup(copied, 0, value)).toBeNull();
    },
);

test.each([
    { startTick: -1 },
    { startTick: NaN },
    { durationTicks: 0 },
    { durationTicks: Infinity },
    { pitch: 128 },
    { pitch: 60.5 },
    { velocity: -1 },
    { velocity: NaN },
])('invalid source data cannot produce a partial paste (%j)', (invalid) => {
    expect(
        pasteNoteGroup([copied[0], { ...copied[1], ...invalid }], 0, 1920),
    ).toBeNull();
});

test('an empty clipboard produces no notes', () => {
    expect(pasteNoteGroup([], 0, 1920)).toEqual([]);
});
