import { expect, test } from 'vitest';
import { tickToSeconds } from '@/features/piano-roll/utils/tickToSeconds';

test('converts tick to second', () => {
  expect(tickToSeconds(960, 480, 60)).toBe(2);
});

test('converts two beats to one second at 120 BPM', () => {
  const seconds = tickToSeconds(960, 480, 120);
  expect(seconds).toBe(1);
});
