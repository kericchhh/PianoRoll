import { expect, test } from 'vitest';
import { isValidMidiNote } from '@/features/piano-roll/midi/isValidMidiNote';
import { MAX_MIDI_TICK } from '@/features/piano-roll/midi/importLimits';

const note = { pitch: 60, startTick: 7, durationTicks: 13, velocity: 70 };
test('validates the same musical data boundary for MIDI import and export', () => {
    expect(isValidMidiNote(note)).toBe(true);
    expect(isValidMidiNote({ ...note, startTick: MAX_MIDI_TICK - 13 })).toBe(
        true,
    );
    for (const patch of [
        { pitch: -1 },
        { pitch: 128 },
        { pitch: 60.5 },
        { startTick: -1 },
        { durationTicks: 0 },
        { durationTicks: 1.5 },
        { velocity: NaN },
        { velocity: 128 },
        { startTick: MAX_MIDI_TICK - 12 },
    ])
        expect(isValidMidiNote({ ...note, ...patch })).toBe(false);
});
