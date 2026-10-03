import { expect, test, vi } from 'vitest';
import { drawTimeLine } from '@/features/piano-roll/rendering/drawTimeLine';
import { drawPitchRows } from '@/features/piano-roll/rendering/drawPitchRows';

test('grid passes establish stroke width instead of inheriting note outline styles', () => {
  const context = {
    lineWidth: 2,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
  drawTimeLine(context as unknown as CanvasRenderingContext2D, 0, 240);
  expect(context.lineWidth).toBe(1);
  context.lineWidth = 2;
  drawPitchRows(context as unknown as CanvasRenderingContext2D, 600, 240, 20);
  expect(context.lineWidth).toBe(1);
});
