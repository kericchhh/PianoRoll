import { afterEach, expect, test, vi } from 'vitest';
import {
    createProjectRecord,
    parseProjectRecord,
    type ProjectRecord,
} from '@/features/piano-roll/persistence/projectRecord';
import type { Note } from '@/features/piano-roll/types';

const note: Note = {
    id: 'exact-id',
    pitch: 127,
    startTick: 70001,
    durationTicks: 1,
    velocity: 0,
    selected: true,
};
function project(): ProjectRecord {
    const { selected: _selected, ...saved } = note;
    void _selected;
    return {
        id: 'local',
        version: 2,
        bpm: 120,
        ppq: 480,
        beatsPerBar: 4,
        barCount: 4,
        savedAt: 1000,
        notes: [saved],
    };
}
afterEach(() => vi.restoreAllMocks());

test('save preserves IDs, short unsnapped and silent overflow notes without selection or mutable references', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    const source = { [note.id]: note };
    const saved = createProjectRecord(source, 8, 120);
    expect(saved).toEqual({ ...project(), barCount: 8, savedAt: 1234 });
    expect(saved.notes[0]).not.toBe(note);
    expect(saved.notes[0]).not.toHaveProperty('selected');
    saved.notes[0].pitch = 0;
    expect(source[note.id]).toEqual(note);
});

test('all supported timeline lengths and empty compositions round-trip', () => {
    for (const barCount of [4, 8, 16, 32]) {
        const input = { ...project(), barCount, notes: [] };
        expect(parseProjectRecord(input)).toEqual(input);
    }
});

test('parsed records own their note data and preserve exact musical values', () => {
    const input = project();
    const parsed = parseProjectRecord(input);
    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
    expect(parsed.notes).not.toBe(input.notes);
    expect(parsed.notes[0]).not.toBe(input.notes[0]);
    parsed.notes[0].startTick = 0;
    expect(input.notes[0].startTick).toBe(70001);
});

test.each([
    null,
    [],
    'project',
    {},
    { ...project(), id: 'another-slot' },
    { ...project(), version: 3 },
    { ...project(), ppq: 960 },
    { ...project(), beatsPerBar: 3 },
    { ...project(), barCount: 12 },
    { ...project(), savedAt: Infinity },
    { ...project(), savedAt: NaN },
    { ...project(), savedAt: '1000' },
    { ...project(), notes: {} },
    { ...project(), notes: [null] },
    { ...project(), notes: new Array(1) },
    { ...project(), notes: [project().notes[0], project().notes[0]] },
])('rejects malformed or unsupported project %j', (value) => {
    expect(() => parseProjectRecord(value)).toThrow();
});

test.each([
    ['id', ''],
    ['id', 1],
    ['pitch', -1],
    ['pitch', 128],
    ['pitch', 60.5],
    ['velocity', -1],
    ['velocity', 128],
    ['velocity', 0.5],
    ['startTick', -1],
    ['startTick', 0.5],
    ['startTick', Infinity],
    ['startTick', Number.MAX_SAFE_INTEGER + 1],
    ['durationTicks', 0],
    ['durationTicks', -1],
    ['durationTicks', 0.5],
    ['durationTicks', NaN],
    ['durationTicks', Number.MAX_SAFE_INTEGER + 1],
])('rejects invalid persisted note field %s=%j', (field, value) => {
    const input = project();
    expect(() =>
        parseProjectRecord({
            ...input,
            notes: [{ ...input.notes[0], [field]: value }],
        }),
    ).toThrow();
});

test('rejects a note endpoint beyond safe integer precision', () => {
    const input = project();
    expect(() =>
        parseProjectRecord({
            ...input,
            notes: [{ ...input.notes[0], startTick: Number.MAX_SAFE_INTEGER }],
        }),
    ).toThrow();
});

test('version one projects migrate to the current record shape with the default tempo', () => {
    const { bpm, ...legacy } = project();
    expect(bpm).toBe(120);
    const parsed = parseProjectRecord({ ...legacy, version: 1 });
    expect(parsed).toEqual(project());
    expect(parsed.notes).not.toBe(legacy.notes);
});

test.each([30, 93, 120, 177, 300])(
    'project tempo %i round-trips without persisting local editing preferences',
    (bpm) => {
        const record = createProjectRecord({ [note.id]: note }, 16, bpm);
        expect(record.version).toBe(2);
        expect(record.bpm).toBe(bpm);
        expect(parseProjectRecord(record)).toEqual(record);
        expect(record).not.toHaveProperty('snapTicks');
    },
);

test.each([undefined, null, '120', NaN, Infinity, 29, 301, 120.5])(
    'current-version projects reject invalid tempo %j',
    (bpm) => {
        expect(() => parseProjectRecord({ ...project(), bpm })).toThrow();
        expect(() => createProjectRecord({}, 8, bpm as number)).toThrow();
    },
);
