import { expect, test } from 'vitest';
import { tickToPixel } from '@/features/piano-roll/utils/tickToPixel';

test('places tick zero at the origin', () => {
    expect(tickToPixel(0, 0.25, 0)).toBe(0);
});

test('scales ticks into pixels', () => {
    expect(tickToPixel(480, 0.25, 0)).toBe(120);
});

test('moves content left when scrolled right', () => {
    expect(tickToPixel(480, 0.25, 20)).toBe(100);
});
