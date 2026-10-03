import { expect, test, vi } from 'vitest';
import { drawNote } from '@/features/piano-roll/rendering/drawNote';

function makeContext() {
  const fillRect = vi.fn();
  const strokeRect = vi.fn();
  const context = {
    fillRect,
    strokeRect,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  } as unknown as CanvasRenderingContext2D;
  return { context, fillRect, strokeRect };
}

const view = {
  pixelsPerTick: 0.5,
  scrollOffsetX: 0,
  highestVisiblePitch: 72,
  rowHeight: 20,
};

test('draws a selected note with a visible outline', () => {
  const { context, fillRect, strokeRect } = makeContext();
  drawNote(
    context,
    { pitch: 71, startTick: 120, durationTicks: 120, selected: true },
    view,
  );

  expect(fillRect).toHaveBeenCalledWith(60, 20, 60, 20);
  expect(strokeRect).toHaveBeenCalledWith(61, 21, 58, 18);
  expect(context.strokeStyle).toBe('#ffffff');
});

test('does not outline an unselected note', () => {
  const { context, strokeRect } = makeContext();
  drawNote(
    context,
    { pitch: 71, startTick: 120, durationTicks: 120, selected: false },
    view,
  );

  expect(strokeRect).not.toHaveBeenCalled();
});

test('draws an unselected origin ghost in gray', () => {
  const { context, fillRect, strokeRect } = makeContext();
  drawNote(
    context,
    { pitch: 71, startTick: 120, durationTicks: 120, selected: false },
    view,
    '#94a3b8',
  );

  expect(context.fillStyle).toBe('#94a3b8');
  expect(fillRect).toHaveBeenCalledWith(60, 20, 60, 20);
  expect(strokeRect).not.toHaveBeenCalled();
});

test('keeps a selected note outline inside its bounds at the 32-bar minimum zoom', () => {
  const { context, strokeRect } = makeContext();
  const scale = 600 / (32 * 4 * 480);
  drawNote(
    context,
    { pitch: 72, startTick: 0, durationTicks: 120, selected: true },
    { ...view, pixelsPerTick: scale },
  );
  const [x, , width] = strokeRect.mock.calls[0];
  expect(width).toBeGreaterThan(0);
  expect(x - context.lineWidth / 2).toBeCloseTo(0);
  expect(x + width + context.lineWidth / 2).toBeCloseTo(120 * scale);
});
