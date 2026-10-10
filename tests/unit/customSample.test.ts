import { expect, test } from 'vitest';
import {
    validateSampleFile,
    validateSampleBuffer,
    MAX_SAMPLE_BYTES,
} from '@/features/piano-roll/audio/customSample';

test('accepts roots that keep all 128 editor pitches within Tone’s 95-semitone search range', () => {
    for (let root = 32; root <= 95; root++) {
        expect(() => validateSampleFile(1, root)).not.toThrow();
        for (let pitch = 0; pitch <= 127; pitch++)
            expect(Math.abs(pitch - root)).toBeLessThan(96);
    }
    expect(() => validateSampleFile(MAX_SAMPLE_BYTES, 95)).not.toThrow();
});

test('rejects empty or oversized files and invalid root pitches before decoding', () => {
    for (const size of [0, -1, MAX_SAMPLE_BYTES + 1])
        expect(() => validateSampleFile(size, 60)).toThrow();
    for (const pitch of [-1, 0, 31, 96, 127, 128, 60.5, NaN])
        expect(() => validateSampleFile(1, pitch)).toThrow(/root pitch/);
});

test('bounds decoded duration and memory while retaining stereo samples', () => {
    expect(() =>
        validateSampleBuffer({
            duration: 30,
            length: 1440000,
            numberOfChannels: 2,
        }),
    ).not.toThrow();
    for (const duration of [0, -1, NaN, Infinity, 31])
        expect(() =>
            validateSampleBuffer({
                duration,
                length: 100,
                numberOfChannels: 2,
            }),
        ).toThrow(/30 seconds/);
    expect(() =>
        validateSampleBuffer({
            duration: 30,
            length: 40000000,
            numberOfChannels: 2,
        }),
    ).toThrow(/too large/);
});
