import { expect, test } from 'vitest';
import { pixelToPitch } from '@/features/piano-roll/utils/pixelToPitch';
import { pitchToPixel } from '@/features/piano-roll/utils/pitchtoPixel';

test.each([
    [0, 72],
    [1, 72],
    [19.99, 72],
    [20, 71],
    [39.99, 71],
    [40, 70],
    [220, 61],
    [239.99, 61],
])('maps Y=%s to the containing row, pitch %s', (pixelY, expectedPitch) => {
    expect(pixelToPitch(pixelY, 72, 20)).toBe(expectedPitch);
});

test('uses the configured highest visible pitch', () => {
    expect(pixelToPitch(20, 60, 20)).toBe(59);
});

test('supports different row heights', () => {
    expect(pixelToPitch(24.99, 72, 12.5)).toBe(71);
    expect(pixelToPitch(25, 72, 12.5)).toBe(70);
});

test.each([
    [0, 127],
    [2540, 0],
])('can map Y=%s to MIDI boundary pitch %s', (pixelY, pitch) => {
    expect(pixelToPitch(pixelY, 127, 20)).toBe(pitch);
});

test('maps rendered row tops and centers back to their note pitches', () => {
    for (const pitch of [72, 71, 61]) {
        const rowTop = pitchToPixel(pitch, 72, 20);
        expect(pixelToPitch(rowTop, 72, 20)).toBe(pitch);
        expect(pixelToPitch(rowTop + 10, 72, 20)).toBe(pitch);
    }
});
