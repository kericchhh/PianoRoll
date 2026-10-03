import type { KeyboardEvent, RefObject } from 'react';
import type { GestureMode, Note } from '@/features/piano-roll/types';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { moveNoteGroup } from '@/features/piano-roll/utils/moveNoteGroup';
import { resizeNoteGroup } from '@/features/piano-roll/utils/resizeNoteGroup';
import { SNAP_TICKS } from '@/features/piano-roll/constants';

type Options = {
  endTick: number;
  gestureModeRef: RefObject<GestureMode>;
  commitMove: (originals: readonly Note[], moved: readonly Note[]) => void;
  commitResize: (originals: readonly Note[], resized: readonly Note[]) => void;
  deleteNotes: (ids: readonly string[]) => void;
};

export function useNoteKeyboard({
  endTick,
  gestureModeRef,
  commitMove,
  commitResize,
  deleteNotes,
}: Options) {
  return function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      !(event.target instanceof HTMLElement) ||
      !event.currentTarget.contains(event.target) ||
      event.target.closest(
        'input, textarea, select, [contenteditable], [role="menu"]',
      )
    )
      return;
    if (gestureModeRef.current !== 'idle') return;
    if (event.key !== 'Delete' && !event.key.startsWith('Arrow')) return;
    const selected = Object.values(useNoteStore.getState().notes).filter(
      (note) => note.selected,
    );
    if (selected.length === 0) return;
    if (event.key === 'Delete') {
      if (event.repeat) return;
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      deleteNotes(selected.map((note) => note.id));
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.shiftKey) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      commitResize(
        selected,
        resizeNoteGroup(
          selected,
          event.key === 'ArrowLeft' ? -SNAP_TICKS : SNAP_TICKS,
          endTick,
        ),
      );
      return;
    }
    let tickDelta = 0,
      pitchDelta = 0;
    switch (event.key) {
      case 'ArrowLeft':
        tickDelta = -SNAP_TICKS;
        break;
      case 'ArrowRight':
        tickDelta = SNAP_TICKS;
        break;
      case 'ArrowUp':
        pitchDelta = 1;
        break;
      case 'ArrowDown':
        pitchDelta = -1;
        break;
      default:
        return;
    }
    event.preventDefault();
    commitMove(
      selected,
      moveNoteGroup(selected, tickDelta, pitchDelta, endTick),
    );
  };
}
