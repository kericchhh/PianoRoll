import { expect, test } from 'vitest';
import { pixelToTick } from '@/features/piano-roll/utils/pixelToTick';
import { tickToPixel } from '@/features/piano-roll/utils/tickToPixel';

test('maps the unscrolled origin to tick zero', () => {
    expect(pixelToTick(0, 0.5, 0)).toBe(0);
});

test('accounts for zoom when converting a screen position', () => {
    expect(pixelToTick(120, 0.5, 0)).toBe(240);
    expect(pixelToTick(120, 0.25, 0)).toBe(480);
});

test('accounts for horizontal scroll', () => {
    expect(pixelToTick(120, 0.5, 60)).toBe(360);
});

test('maps the viewport left edge to the first visible tick', () => {
    expect(pixelToTick(0, 0.5, 120)).toBe(240);
});

test('preserves fractional ticks for a separate snapping step', () => {
    expect(pixelToTick(10.25, 0.5, 0)).toBe(20.5);
});

test('does not silently clamp positions before the timeline', () => {
    expect(pixelToTick(-10, 0.5, 0)).toBe(-20);
});

test.each([
    [0, 0.5, 0],
    [480, 0.25, 20],
    [960, 0.123, 45.5],
    [20.5, 0.5, 60],
])(
    'reverses tickToPixel for tick %s, scale %s, scroll %s',
    (tick, scale, scroll) => {
        const pixelX = tickToPixel(tick, scale, scroll);
        expect(pixelToTick(pixelX, scale, scroll)).toBeCloseTo(tick);
    },
);
