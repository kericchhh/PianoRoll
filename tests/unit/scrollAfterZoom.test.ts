import { expect, test } from 'vitest';
import { scrollAfterZoom } from '@/features/piano-roll/utils/scrollAfterZoom';

test('keeps the cursor tick fixed when zooming in', () => {
    expect(scrollAfterZoom(120, 0, 0.5, 1)).toBe(120);
});

test('accounts for existing scroll', () => {
    expect(scrollAfterZoom(120, 80, 0.5, 1)).toBe(280);
});

test('preserves scroll when scale stays unchanged', () => {
    expect(scrollAfterZoom(120, 80, 0.5, 0.5)).toBe(80);
});

test('keeps the cursor tick fixed when zooming out', () => {
    expect(scrollAfterZoom(120, 280, 1, 0.5)).toBe(80);
});
