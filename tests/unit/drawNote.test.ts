import { expect, test, vi } from 'vitest';
import { drawNote } from '@/features/piano-roll/utils/drawNote';

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
