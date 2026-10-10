import { expect, test } from 'vitest';
import { Midi } from '@tonejs/midi';
import { parseMidi } from '@/features/piano-roll/midi/parseMidi';
import { MAX_MIDI_BYTES } from '@/features/piano-roll/midi/importLimits';
import { serializeMidi } from '@/features/piano-roll/midi/serializeMidi';

function fixture(ppq = 960) {
    const midi = new Midi();
    midi.header.fromJSON({ ...midi.header.toJSON(), ppq });
    midi.addTrack().addNote({
        midi: 60,
        ticks: 17,
        durationTicks: 73,
        velocity: 1,
    });
    midi.addTrack().addNote({
        midi: 72,
        ticks: 0,
        durationTicks: 960,
        velocity: 70 / 127,
    });
    return midi.toArray();
}

test('merges tracks, rescales endpoints to project ticks, preserves velocity and does not quantize', () => {
    const bytes = fixture();
    const before = bytes.slice();
    expect(parseMidi(bytes)).toEqual({
        notes: [
            { pitch: 72, startTick: 0, durationTicks: 480, velocity: 70 },
            { pitch: 60, startTick: 9, durationTicks: 36, velocity: 127 },
        ],
        endTick: 480,
    });
    expect(bytes).toEqual(before);
});

test('export then import preserves overlapping notes, short durations and notes beyond the grid', () => {
    const notes = [
        {
            id: 'a',
            pitch: 64,
            startTick: 7,
            durationTicks: 13,
            velocity: 1,
            selected: true,
        },
        {
            id: 'b',
            pitch: 64,
            startTick: 8,
            durationTicks: 4,
            velocity: 127,
            selected: false,
        },
        {
            id: 'c',
            pitch: 127,
            startTick: 90000,
            durationTicks: 960,
            velocity: 100,
            selected: false,
        },
    ];
    const result = parseMidi(serializeMidi(notes, 91).bytes);
    expect(result.notes).toEqual(
        notes.map(({ pitch, startTick, durationTicks, velocity }) => ({
            pitch,
            startTick,
            durationTicks,
            velocity,
        })),
    );
    expect(result.endTick).toBe(90960);
});

test('valid empty MIDI can replace a composition and byte views respect their offset', () => {
    const midi = new Midi();
    midi.addTrack();
    expect(parseMidi(midi.toArray())).toEqual({ notes: [], endTick: 0 });
    const bytes = fixture();
    const padded = new Uint8Array(bytes.length + 12);
    padded.set(bytes, 6);
    expect(parseMidi(padded.subarray(6, -6))).toEqual(parseMidi(bytes));
});

test('rejects oversized, non-MIDI, truncated and extra data', () => {
    expect(() => parseMidi(new Uint8Array(MAX_MIDI_BYTES + 1))).toThrow(/2 MB/);
    expect(() => parseMidi(new Uint8Array([1, 2, 3]))).toThrow(/valid/);
    const bytes = fixture();
    expect(() => parseMidi(bytes.slice(0, -1))).toThrow(/incomplete/);
    const extra = new Uint8Array(bytes.length + 1);
    extra.set(bytes);
    expect(() => parseMidi(extra)).toThrow(/trailing/);
});

test('rejects independent sequences and SMPTE timebases rather than treating them as PPQ', () => {
    const bytes = fixture();
    const view = new DataView(bytes.buffer);
    view.setUint16(8, 2);
    expect(() => parseMidi(bytes)).toThrow(/format 2/);
    view.setUint16(8, 1);
    view.setUint16(12, 0xe728);
    expect(() => parseMidi(bytes)).toThrow(/SMPTE/);
    view.setUint16(12, 0);
    expect(() => parseMidi(bytes)).toThrow(/PPQ/);
});

test('durations shorter than one project tick remain positive', () => {
    const midi = new Midi();
    midi.header.fromJSON({ ...midi.header.toJSON(), ppq: 32767 });
    midi.addTrack().addNote({
        midi: 60,
        ticks: 1,
        durationTicks: 1,
        velocity: 1,
    });
    expect(parseMidi(midi.toArray()).notes[0].durationTicks).toBe(1);
});

test('rejects excessive note counts', () => {
    const midi = new Midi();
    const track = midi.addTrack();
    for (let index = 0; index < 10001; index++)
        track.addNote({
            midi: 60,
            ticks: index * 2,
            durationTicks: 1,
            velocity: 1,
        });
    expect(() => parseMidi(midi.toArray())).toThrow(/10,000/);
});

test('rejects source ticks that overflow the supported MIDI range after PPQ conversion', () => {
    const midi = new Midi();
    midi.header.fromJSON({ ...midi.header.toJSON(), ppq: 1 });
    midi.addTrack().addNote({
        midi: 60,
        ticks: 5000000,
        durationTicks: 1,
        velocity: 1,
    });
    expect(() => parseMidi(midi.toArray())).toThrow(/invalid note data/);
});
