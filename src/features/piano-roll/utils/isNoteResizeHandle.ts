import type { Note } from '@/features/piano-roll/types';

export function isNoteResizeHandle(
  note: Pick<Note, 'startTick' | 'durationTicks'>,
  tick: number,
  pixelsPerTick: number,
  canvasScaleX = 1,
): boolean {
  if (pixelsPerTick <= 0 || canvasScaleX <= 0) return false;
  const distance = (note.startTick + note.durationTicks - tick) * pixelsPerTick;
  const handleWidth = Math.min(
    6 * canvasScaleX,
    (note.durationTicks * pixelsPerTick) / 2,
  );
  return distance > 0 && distance <= handleWidth;
}
