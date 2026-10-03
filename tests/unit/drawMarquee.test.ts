import { expect, test, vi } from 'vitest';
import { drawMarquee } from '@/features/piano-roll/rendering/drawMarquee';

function makeContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  };
}

test('draws a reverse-drag rectangle with normalized dimensions and isolated styles', () => {
  const context = makeContext();
  drawMarquee(context as unknown as CanvasRenderingContext2D, {
    startX: 100,
    endX: 25,
    startY: 65,
    endY: 5,
  });

  expect(context.fillRect).toHaveBeenCalledWith(25, 5, 75, 60);
  expect(context.strokeRect).toHaveBeenCalledWith(25, 5, 75, 60);
  expect(context.fillStyle).toBe('rgba(37, 99, 235, 0.12)');
  expect(context.strokeStyle).toBe('#2563eb');
  expect(context.lineWidth).toBe(1);
  expect(context.save).toHaveBeenCalledOnce();
  expect(context.restore).toHaveBeenCalledOnce();
});

test('does not draw zero-area rectangles', () => {
  const context = makeContext();
  for (const rect of [
    { startX: 20, endX: 20, startY: 0, endY: 40 },
    { startX: 0, endX: 60, startY: 20, endY: 20 },
  ])
    drawMarquee(context as unknown as CanvasRenderingContext2D, rect);

  expect(context.fillRect).not.toHaveBeenCalled();
  expect(context.strokeRect).not.toHaveBeenCalled();
});
