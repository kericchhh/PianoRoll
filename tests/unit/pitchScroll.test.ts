import { expect, test } from 'vitest';
import {
    clampHighestPitch,
    pitchScrollDelta,
} from '@/features/piano-roll/utils/viewport/pitchScroll';

test('pixel, line and page wheels change pitch rows in the normal scrolling direction', () => {
    expect(pitchScrollDelta(100, 0, 240, 0)).toEqual({
        rows: -5,
        remainder: 0,
    });
    expect(pitchScrollDelta(-1, 1, 240, 0)).toEqual({ rows: 1, remainder: 0 });
    expect(pitchScrollDelta(1, 2, 240, 0)).toEqual({ rows: -12, remainder: 0 });
});

test('trackpad deltas accumulate without losing fractional motion or rounding each event', () => {
    const first = pitchScrollDelta(7.5, 0, 240, 0);
    expect(first).toEqual({ rows: -0, remainder: 7.5 });
    const second = pitchScrollDelta(15, 0, 240, first.remainder);
    expect(second).toEqual({ rows: -1, remainder: 2.5 });
    expect(pitchScrollDelta(-22.5, 0, 240, second.remainder)).toEqual({
        rows: 1,
        remainder: 0,
    });
});

test('viewport bounds fill a partial bottom row and never show keys outside MIDI 0–127', () => {
    expect(clampHighestPitch(200, 240)).toBe(127);
    expect(clampHighestPitch(-100, 240)).toBe(11);
    expect(clampHighestPitch(-100, 241)).toBe(12);
    expect(clampHighestPitch(-100, 259)).toBe(12);
    expect(clampHighestPitch(-100, 19)).toBe(0);
    expect(clampHighestPitch(72, 240)).toBe(72);
    expect(clampHighestPitch(-100, 3000)).toBe(127);
});

test.each([1, 19, 20, 21, 239, 240, 241, 259, 260, 1003])(
    'lowest-pitch viewport of %i pixels has enough valid rows to cover its bottom',
    (height) => {
        const highest = clampHighestPitch(-10000, height);
        const rows = Math.ceil(height / 20);
        const lowest = highest - rows + 1;
        expect(lowest).toBe(0);
        expect(highest).toBeLessThanOrEqual(127);
        expect((highest + 1) * 20).toBeGreaterThanOrEqual(height);
        expect(highest * 20).toBeLessThan(height);
    },
);
