import { expect, test } from 'vitest';
import { Midi } from '@tonejs/midi';
import type { Note } from '@/features/piano-roll/types';
import { serializeMidi } from '@/features/piano-roll/midi/serializeMidi';
import { groupMidiNotes } from '@/features/piano-roll/midi/groupMidiNotes';
import { PPQ } from '@/features/piano-roll/constants';

function note(id: string, fields: Partial<Note> = {}): Note {
    return {
        id,
        pitch: 60,
        startTick: 120,
        durationTicks: 240,
        velocity: 100,
        selected: false,
        ...fields,
    };
}

test('rejects tick values that would overflow the MIDI writer’s variable-length integer', () => {
    expect(() =>
        serializeMidi([note('huge', { startTick: 2400000000 })], 120),
    ).toThrow(/invalid note data/);
});

function musicalNotes(notes: readonly Note[]) {
    return notes
        .map(({ pitch, startTick, durationTicks, velocity }) => ({
            pitch,
            startTick,
            durationTicks,
            velocity,
        }))
        .sort(compare);
}

function compare(
    a: Pick<Note, 'pitch' | 'startTick' | 'durationTicks' | 'velocity'>,
    b: Pick<Note, 'pitch' | 'startTick' | 'durationTicks' | 'velocity'>,
): number {
    return (
        a.startTick - b.startTick ||
        a.pitch - b.pitch ||
        a.durationTicks - b.durationTicks ||
        a.velocity - b.velocity
    );
}

function decodedNotes(midi: Midi) {
    return midi.tracks
        .flatMap((track) =>
            track.notes.map((note) => ({
                pitch: note.midi,
                startTick: note.ticks,
                durationTicks: note.durationTicks,
                velocity: Math.round(note.velocity * 127),
            })),
        )
        .sort(compare);
}

test('exports project timing, current tempo, piano program, and all notes without mutating input', () => {
    const notes = Object.freeze([
        Object.freeze(
            note('late', {
                pitch: 127,
                startTick: 50000,
                durationTicks: 960,
                velocity: 127,
            }),
        ),
        Object.freeze(
            note('early', {
                pitch: 0,
                startTick: 7,
                durationTicks: 13,
                velocity: 1,
                selected: true,
            }),
        ),
        Object.freeze(
            note('middle', {
                pitch: 64,
                startTick: 480,
                durationTicks: 480,
                velocity: 70,
            }),
        ),
    ]);
    const result = serializeMidi(notes, 93);
    const parsed = new Midi(result.bytes);
    expect(new TextDecoder().decode(result.bytes.slice(0, 4))).toBe('MThd');
    expect(parsed.header.ppq).toBe(PPQ);
    expect(parsed.header.timeSignatures[0].timeSignature).toEqual([4, 4]);
    expect(parsed.header.tempos).toHaveLength(1);
    expect(parsed.header.tempos[0].ticks).toBe(0);
    expect(parsed.header.tempos[0].bpm).toBeCloseTo(93, 3);
    expect(parsed.tracks).toHaveLength(1);
    expect(parsed.tracks[0].instrument.number).toBe(0);
    expect(parsed.tracks[0].name).toBe('Piano');
    expect(decodedNotes(parsed)).toEqual(musicalNotes(notes));
    expect(result.noteCount).toBe(3);
    expect(result.omittedNoteCount).toBe(0);
    expect(notes.map((note) => note.id)).toEqual(['late', 'early', 'middle']);
    expect(notes[1].selected).toBe(true);
});

test('every nonzero integer MIDI velocity round-trips exactly', () => {
    const notes = Array.from({ length: 127 }, (_, i) =>
        note(String(i), { startTick: i * 480, velocity: i + 1 }),
    );
    expect(decodedNotes(new Midi(serializeMidi(notes, 120).bytes))).toEqual(
        musicalNotes(notes),
    );
});

test('nested, simultaneous and back-to-back same-pitch notes keep their original durations', () => {
    const notes = [
        note('outer', { startTick: 0, durationTicks: 960 }),
        note('inner-a', { startTick: 240, durationTicks: 120, velocity: 80 }),
        note('inner-b', { startTick: 360, durationTicks: 120, velocity: 60 }),
        note('other-pitch', { pitch: 64, durationTicks: 240 }),
        note('simultaneous', {
            startTick: 240,
            durationTicks: 120,
            velocity: 70,
        }),
    ];
    const parsed = new Midi(serializeMidi(notes, 120).bytes);
    expect(parsed.tracks).toHaveLength(3);
    expect(parsed.tracks.map((track) => track.name)).toEqual([
        'Piano 1',
        'Piano 2',
        'Piano 3',
    ]);
    expect(parsed.tracks.every((track) => track.instrument.number === 0)).toBe(
        true,
    );
    expect(decodedNotes(parsed)).toEqual(musicalNotes(notes));
});

test('touching notes and overlaps of different pitches share a single piano track', () => {
    const notes = [
        note('second', { startTick: 360 }),
        note('first', { startTick: 120 }),
        note('chord', { pitch: 64, startTick: 120, durationTicks: 960 }),
    ];
    const parsed = new Midi(serializeMidi(notes, 120).bytes);
    expect(parsed.tracks).toHaveLength(1);
    expect(decodedNotes(parsed)).toEqual(musicalNotes(notes));
});

test('silent notes are omitted without releasing audible notes of the same pitch', () => {
    const audible = note('held', { startTick: 0, durationTicks: 960 });
    const silent = note('silent', { startTick: 240, velocity: 0 });
    const result = serializeMidi([audible, silent], 120);
    expect(decodedNotes(new Midi(result.bytes))).toEqual(
        musicalNotes([audible]),
    );
    expect(result.noteCount).toBe(1);
    expect(result.omittedNoteCount).toBe(1);
});

test.each([{ notes: [] }, { notes: [note('silent', { velocity: 0 })] }])(
    'empty and silent projects still produce valid MIDI',
    ({ notes }) => {
        const result = serializeMidi(notes, 120);
        const parsed = new Midi(result.bytes);
        expect(parsed.header.ppq).toBe(PPQ);
        expect(decodedNotes(parsed)).toEqual([]);
        expect(result.noteCount).toBe(0);
    },
);

test('grouping keeps source references and order intact and reuses available tracks', () => {
    const notes = [
        note('late', { startTick: 960 }),
        note('held', { startTick: 0, durationTicks: 960 }),
        note('inner', { startTick: 120 }),
        note('chord', { pitch: 64, startTick: 120 }),
    ];
    const groups = groupMidiNotes(notes);
    expect(groups.map((group) => group.map((note) => note.id))).toEqual([
        ['held', 'chord', 'late'],
        ['inner'],
    ]);
    expect(groups[0][0]).toBe(notes[1]);
    expect(notes.map((note) => note.id)).toEqual([
        'late',
        'held',
        'inner',
        'chord',
    ]);
    expect(groupMidiNotes([])).toEqual([]);
});

test('a thousand notes round-trip without losing pitch, timing or velocity', () => {
    const notes = Array.from({ length: 1000 }, (_, i) =>
        note(String(i), {
            pitch: 48 + (i % 36),
            startTick: Math.floor(i / 12) * 120,
            durationTicks: 120 + (i % 4) * 120,
            velocity: 1 + (i % 127),
        }),
    );
    expect(decodedNotes(new Midi(serializeMidi(notes, 120).bytes))).toEqual(
        musicalNotes(notes),
    );
});

test.each([0, -1, NaN, Infinity])(
    'invalid tempo %s fails before writing bytes',
    (bpm) => {
        expect(() => serializeMidi([note('a')], bpm)).toThrow(RangeError);
    },
);

test.each([
    { pitch: -1 },
    { pitch: 128 },
    { pitch: 60.5 },
    { startTick: -1 },
    { startTick: 0.5 },
    { startTick: Infinity },
    { durationTicks: 0 },
    { durationTicks: -1 },
    { durationTicks: NaN },
    { velocity: -1 },
    { velocity: 128 },
    { velocity: 1.5 },
])('invalid note fields %j fail before writing bytes', (fields) => {
    expect(() => serializeMidi([note('a', fields)], 120)).toThrow(RangeError);
});
