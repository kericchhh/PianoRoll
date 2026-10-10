import { expect, test } from 'vitest';
import { pitchToNoteName } from '@/features/piano-roll/utils/notes/pitchToNoteName';

test.each([
    [0, 'C-1'],
    [12, 'C0'],
    [21, 'A0'],
    [60, 'C4'],
    [61, 'C#4'],
    [63, 'D#4'],
    [66, 'F#4'],
    [68, 'G#4'],
    [70, 'A#4'],
    [72, 'C5'],
    [127, 'G9'],
])('MIDI pitch %i is labelled %s', (pitch, label) => {
    expect(pitchToNoteName(pitch as number)).toBe(label);
});
