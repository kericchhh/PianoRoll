import type { Note, PianoRollView } from '@/features/piano-roll/types';
import { clampScroll } from '@/features/piano-roll/utils/clampScroll';

export function revealNotes(
  notes: readonly Note[],
  view: PianoRollView,
  width: number,
  height: number,
  endTick: number,
): PianoRollView {
  if (notes.length === 0) return view;
  const anchor = notes[0];
  const rows = Math.floor(height / view.rowHeight);
  const left =
    Math.min(...notes.map((note) => note.startTick)) * view.pixelsPerTick;
  const right =
    Math.max(...notes.map((note) => note.startTick + note.durationTicks)) *
    view.pixelsPerTick;
  const highest = Math.max(...notes.map((note) => note.pitch));
  const lowest = Math.min(...notes.map((note) => note.pitch));
  const targetLeft =
    right - left > width ? anchor.startTick * view.pixelsPerTick : left;
  const targetRight =
    right - left > width
      ? (anchor.startTick + anchor.durationTicks) * view.pixelsPerTick
      : right;
  let scroll = view.scrollOffsetX;
  if (targetLeft < scroll) scroll = targetLeft;
  else if (targetRight > scroll + width)
    scroll = Math.min(targetLeft, targetRight - width);
  const topPitch = highest - lowest >= rows ? anchor.pitch : highest;
  const bottomPitch = highest - lowest >= rows ? anchor.pitch : lowest;
  let highestVisiblePitch = view.highestVisiblePitch;
  if (topPitch > highestVisiblePitch) highestVisiblePitch = topPitch;
  else if (bottomPitch < highestVisiblePitch - rows + 1)
    highestVisiblePitch = bottomPitch + rows - 1;
  return {
    ...view,
    scrollOffsetX: clampScroll(scroll, endTick, view.pixelsPerTick, width),
    highestVisiblePitch: Math.max(rows - 1, Math.min(127, highestVisiblePitch)),
  };
}
