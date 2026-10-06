import { expect, test } from 'vitest';
import { clampScale } from '@/features/piano-roll/utils/viewport/clampScale';
import { clampScroll } from '@/features/piano-roll/utils/viewport/clampScroll';

test.each([4, 8, 16, 32])(
    'fits %s bars exactly at minimum zoom without blank space or scrolling',
    (bars) => {
        const endTick = bars * 1920;
        const scale = clampScale(0.001, endTick, 600);
        expect(endTick * scale).toBeCloseTo(600);
        expect(clampScroll(200, endTick, scale, 600)).toBeCloseTo(0);
    },
);

test('preserves a zoom level that is already within bounds', () => {
    expect(clampScale(0.5, 7680, 600)).toBe(0.5);
});

test('preserves the existing maximum zoom', () => {
    expect(clampScale(10, 7680, 600)).toBe(2);
});

test('raises minimum zoom when shortening the timeline', () => {
    const previousScale = clampScale(0.001, 32 * 1920, 600);
    const nextScale = clampScale(previousScale, 4 * 1920, 600);
    expect(nextScale).toBeGreaterThan(previousScale);
    expect(nextScale * 4 * 1920).toBeCloseTo(600);
});

test('allows fitting a larger timeline after increasing its length', () => {
    const previousScale = clampScale(0.001, 4 * 1920, 600);
    const nextScale = clampScale(previousScale / 8, 32 * 1920, 600);
    expect(nextScale * 32 * 1920).toBeCloseTo(600);
});
