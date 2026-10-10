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

test('viewport bounds reveal the whole bottom key and never show keys outside MIDI 0–127', () => {
    expect(clampHighestPitch(200, 240)).toBe(127);
    expect(clampHighestPitch(-100, 240)).toBe(11);
    expect(clampHighestPitch(-100, 241)).toBe(11);
    expect(clampHighestPitch(-100, 259)).toBe(11);
    expect(clampHighestPitch(-100, 19)).toBe(0);
    expect(clampHighestPitch(72, 240)).toBe(72);
    expect(clampHighestPitch(-100, 3000)).toBe(127);
});
