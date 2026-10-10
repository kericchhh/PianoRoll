import { expect, test } from 'vitest';
import { samplePitch } from '@/features/piano-roll/audio/samplePitch';

test.each([
    ['C4.wav', 60],
    ['Ds4.mp3', 63],
    ['Fs2.mp3', 42],
    ['D#4.flac', 63],
    ['Bb3.ogg', 58],
    ['synth_Cs4_soft.wav', 61],
    ['c4.WAV', 60],
    ['C-1.wav', 0],
    ['G9.wav', 127],
    ['Cb4.wav', 59],
    ['B#3.wav', 60],
    ['60.wav', 60],
    ['MIDI60.mp3', 60],
    ['midi_127.wav', 127],
])('detects the pitch of %s as %i', (filename, pitch) => {
    expect(samplePitch(filename)).toBe(pitch);
});

test.each([
    'lead.wav',
    'synthC4.wav',
    'C4_D4.wav',
    'velocity_64.wav',
    'C10.wav',
    'C-2.wav',
    '128.wav',
    'G#9.wav',
])(
    'leaves %s for manual assignment when no unique valid pitch exists',
    (filename) => {
        expect(samplePitch(filename)).toBeNull();
    },
);
