import { expect, test } from 'vitest';
import { clampScroll } from '@/features/piano-roll/utils/viewport/clampScroll';

const fourBars = 7680;

test('stops scrolling before the timeline starts', () => {
    expect(clampScroll(-120, fourBars, 0.5, 600)).toBe(0);
});

test('preserves scroll at the left boundary', () => {
    expect(clampScroll(0, fourBars, 0.5, 600)).toBe(0);
});

test('preserves valid fractional scroll without rounding', () => {
    expect(clampScroll(123.5, fourBars, 0.5, 600)).toBe(123.5);
});

test('allows the timeline end to align with the viewport right edge', () => {
    expect(clampScroll(3240, fourBars, 0.5, 600)).toBe(3240);
});

test('stops scrolling beyond the timeline end', () => {
    expect(clampScroll(4000, fourBars, 0.5, 600)).toBe(3240);
});

test.each([-120, 0, 4000])(
    'locks scroll to zero when the timeline is narrower than the viewport (scroll %s)',
    (scroll) => {
        expect(clampScroll(scroll, fourBars, 0.0625, 600)).toBe(0);
    },
);

test('locks scroll to zero when the timeline exactly fits the viewport', () => {
    expect(clampScroll(100, fourBars, 0.078125, 600)).toBe(0);
});

test('reclamps a previously valid scroll after zooming out', () => {
    const eightBars = 15360;
    expect(clampScroll(7080, eightBars, 0.5, 600)).toBe(7080);
    expect(clampScroll(7080, eightBars, 0.25, 600)).toBe(3240);
});

test('reclamps scroll when shortening the timeline from eight bars to four', () => {
    expect(clampScroll(7080, 15360, 0.5, 600)).toBe(7080);
    expect(clampScroll(7080, fourBars, 0.5, 600)).toBe(3240);
});
