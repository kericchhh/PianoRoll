import { beforeEach, expect, test, vi } from 'vitest';
import { drawTimeGrid } from '@/features/piano-roll/utils/drawTimeGrid';
import { drawTimeLine } from '@/features/piano-roll/utils/drawTimeLine';

vi.mock('@/features/piano-roll/utils/drawTimeLine', () => ({
  drawTimeLine: vi.fn(),
}));

const context = {} as CanvasRenderingContext2D;

beforeEach(() => vi.clearAllMocks());

test.each([4, 8, 16, 32])(
  'keeps time divisions readable when fitting %s bars into the viewport',
  (bars) => {
    const endTick = bars * 1920;
    drawTimeGrid(context, 600, 240, 600 / endTick, 0, endTick);

    const positions = vi.mocked(drawTimeLine).mock.calls.map((call) => call[1]);
    expect(positions[0]).toBe(0);
    expect(positions.at(-1)).toBe(600);
    expect(positions.length).toBeLessThanOrEqual(51);
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index] - positions[index - 1]).toBeGreaterThanOrEqual(
        12,
      );
    }
  },
);

test('restores the existing subdivisions when zoomed in', () => {
  drawTimeGrid(context, 600, 240, 0.5, 0, 7680);
  const positions = vi.mocked(drawTimeLine).mock.calls.map((call) => call[1]);
  expect(positions).toEqual([
    0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600,
  ]);
});

test('draws only visible divisions within the timeline endpoint', () => {
  drawTimeGrid(context, 600, 240, 0.5, 3760, 7680);
  const positions = vi.mocked(drawTimeLine).mock.calls.map((call) => call[1]);
  expect(positions).toEqual([20, 80]);
});
