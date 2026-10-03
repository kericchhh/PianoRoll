import { useRef, useState, type MouseEvent } from 'react';
import { useDrag } from '@use-gesture/react';
import type {
  PianoRollView,
  Note,
  MarqueeRect,
  GestureMode,
  NoteRegion,
} from '@/features/piano-roll/types';
import { eventToMusicPoint } from '@/features/piano-roll/utils/eventToMusicPoint';
import { findNoteAt } from '@/features/piano-roll/utils/findNoteAt';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { snapTick } from '@/features/piano-roll/utils/snapTick';
import { moveNoteGroup } from '@/features/piano-roll/utils/moveNoteGroup';
import { resizeNoteGroup } from '@/features/piano-roll/utils/resizeNoteGroup';
import { isNoteResizeHandle } from '@/features/piano-roll/utils/isNoteResizeHandle';
import { tickToPixel } from '@/features/piano-roll/utils/tickToPixel';
import { useMarqueeSelection } from '@/features/piano-roll/hooks/useMarqueeSelection';
import { SNAP_TICKS } from '@/features/piano-roll/constants';
import { getCanvasScale } from '@/features/piano-roll/utils/canvasCoordinates';
import { useNoteActions } from '@/features/piano-roll/hooks/useNoteActions';
import { useNoteKeyboard } from '@/features/piano-roll/hooks/useNoteKeyboard';
import type { RefObject } from 'react';

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
  getView: () => PianoRollView;
  endTick: number;
  dragCandidateRef: RefObject<Note | null>;
  previewRef: RefObject<Record<string, Note> | null>;
  marqueeRef: RefObject<MarqueeRect | null>;
  requestRedraw: () => void;
  onReveal?: (notes: readonly Note[]) => void;
  queryNotes?: (region: NoteRegion) => Note[];
  surfaceRef?: RefObject<HTMLDivElement | null>;
};

export function useNoteInteractions({
  canvasRef,
  width,
  height,
  getView,
  endTick,
  dragCandidateRef,
  previewRef,
  marqueeRef,
  requestRedraw,
  onReveal,
  queryNotes,
  surfaceRef,
}: Options) {
  const [menuNoteId, SetMenuNoteId] = useState<string | null>(null);
  const suppressClickRef = useRef(false);
  const dragNotesRef = useRef<readonly Note[]>([]);
  const gestureModeRef = useRef<GestureMode>('idle');
  const dragScaleRef = useRef({ x: 1, y: 1 });
  const {
    announcement,
    activeNoteId,
    activateNote,
    selectNote,
    addNote,
    deleteNote,
    deleteNotes,
    commitMove,
    commitResize,
    announceSelection,
  } = useNoteActions(endTick, onReveal);
  const handleEditorKeyDown = useNoteKeyboard({
    endTick,
    gestureModeRef,
    commitMove,
    commitResize,
    deleteNotes,
  });
  const { startMarquee, updateMarquee, resetMarquee } = useMarqueeSelection({
    canvasRef,
    marqueeRef,
    width,
    height,
    endTick,
    getView,
    requestRedraw,
    onSelectionChange: announceSelection,
    queryNotes,
  });

  function noteAt(tick: number, pitch: number) {
    const notes = queryNotes
      ? Object.fromEntries(
          queryNotes({
            startTick: tick,
            endTick: tick + 1,
            lowestPitch: pitch,
            highestPitch: pitch,
          }).map((note) => [note.id, note]),
        )
      : useNoteStore.getState().notes;
    return findNoteAt(notes, tick, pitch);
  }

  useDrag(
    ({ movement, xy, initial, last, tap, canceled, event }) => {
      if (gestureModeRef.current === 'pan') return;
      const [dx, dy] =
        xy && initial ? [xy[0] - initial[0], xy[1] - initial[1]] : movement;
      const interrupted = canceled || event?.type === 'pointercancel';
      if (updateMarquee({ dx, dy, last, tap, canceled: interrupted })) {
        if (!tap) suppressClickRef.current = true;
        if (last || interrupted) gestureModeRef.current = 'idle';
        return;
      }
      const original = dragCandidateRef.current;
      if (!original) {
        if (last || interrupted) gestureModeRef.current = 'idle';
        return;
      }

      if (tap || interrupted) {
        previewRef.current = null;
        dragCandidateRef.current = null;
        dragNotesRef.current = [];
        gestureModeRef.current = 'idle';
        requestRedraw();
        return;
      }

      if (dragNotesRef.current.length === 0) {
        const store = useNoteStore.getState();
        const anchor = store.notes[original.id];
        if (!anchor) return;
        if (anchor.selected) {
          dragNotesRef.current = Object.values(store.notes).filter(
            (note) => note.selected,
          );
        } else {
          store.selectNote(anchor.id);
          dragNotesRef.current = [useNoteStore.getState().notes[anchor.id]];
        }
      }

      const originals = dragNotesRef.current;
      const view = getView();
      const resizing = gestureModeRef.current === 'resize';
      const anchorTick =
        original.startTick + (resizing ? original.durationTicks : 0);
      const tickDelta =
        resizing && dx === 0
          ? 0
          : snapTick(
              anchorTick + (dx * dragScaleRef.current.x) / view.pixelsPerTick,
              SNAP_TICKS,
            ) - anchorTick;
      const pitchDelta = -Math.round(
        (dy * dragScaleRef.current.y) / view.rowHeight,
      );
      const edited = resizing
        ? resizeNoteGroup(originals, tickDelta, endTick)
        : moveNoteGroup(originals, tickDelta, pitchDelta, endTick);
      suppressClickRef.current = true;

      if (last) {
        previewRef.current = null;
        dragCandidateRef.current = null;
        dragNotesRef.current = [];
        gestureModeRef.current = 'idle';
        if (resizing) commitResize(originals, edited);
        else commitMove(originals, edited);
        requestRedraw();
        return;
      }

      previewRef.current = Object.fromEntries(
        edited.map((note) => [note.id, note]),
      );
      requestRedraw();
    },
    {
      target: surfaceRef ?? canvasRef,
      filterTaps: true,
      pointer: { buttons: 1, keys: false },
    },
  );

  function handleCanvasContextMenu(event: MouseEvent<HTMLElement>) {
    if (event.button !== 2) {
      const notes = useNoteStore.getState().notes;
      const active = activeNoteId && notes[activeNoteId];
      SetMenuNoteId(
        active && active.selected
          ? active.id
          : (Object.values(notes).find((note) => note.selected)?.id ?? null),
      );
      return;
    }
    const point = eventToMusicPoint(
      event,
      width,
      height,
      getView(),
      canvasRef.current ?? undefined,
    );
    const note = point ? noteAt(point.tick, point.pitch) : undefined;
    SetMenuNoteId(note?.id ?? null);
  }

  function handleCanvasClick(event: MouseEvent<HTMLElement>) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (event.shiftKey) return;
    const point = eventToMusicPoint(
      event,
      width,
      height,
      getView(),
      canvasRef.current ?? undefined,
    );
    if (!point) return;
    const match = noteAt(point.tick, point.pitch);
    if (match) {
      selectNote(match.id, event.ctrlKey || event.metaKey);
      return;
    }
    if (event.ctrlKey || event.metaKey) return;
    addNote(point.tick, point.pitch);
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    dragCandidateRef.current = null;
    dragNotesRef.current = [];
    suppressClickRef.current = false;
    gestureModeRef.current = 'idle';
    if (previewRef.current) {
      previewRef.current = null;
      requestRedraw();
    }
    resetMarquee();
    const canvas = canvasRef.current;
    if (canvas)
      dragScaleRef.current = getCanvasScale(canvas, width, height) ?? {
        x: 1,
        y: 1,
      };
    if (event.shiftKey) {
      gestureModeRef.current = 'pan';
      suppressClickRef.current = true;
      return;
    }
    const point = eventToMusicPoint(
      event,
      width,
      height,
      getView(),
      canvasRef.current ?? undefined,
    );
    if (!point) return;
    const match = noteAt(point.tick, point.pitch);
    if (match) activateNote(match.id);
    if (event.ctrlKey || event.metaKey) {
      gestureModeRef.current = 'select';
      if (!match && point.tick >= 0 && point.tick < endTick) {
        gestureModeRef.current = 'marquee';
        startMarquee(point.x, point.y);
      }
      return;
    }
    dragCandidateRef.current = match ?? null;
    if (!match) {
      gestureModeRef.current = 'select';
      return;
    }
    const view = getView();
    const endpointX = tickToPixel(
      match.startTick + match.durationTicks,
      view.pixelsPerTick,
      view.scrollOffsetX,
    );
    gestureModeRef.current =
      endpointX > 0 &&
      endpointX <= width &&
      isNoteResizeHandle(
        match,
        point.tick,
        view.pixelsPerTick,
        dragScaleRef.current.x,
      )
        ? 'resize'
        : 'move';
  }

  return {
    menuNoteId,
    handleCanvasContextMenu,
    handleCanvasClick,
    handleEditorKeyDown,
    deleteNote,
    selectNote,
    addNote,
    alert: announcement.text,
    announcement,
    activeNoteId,
    handleCanvasPointerDown,
    gestureModeRef,
    dragScaleRef,
  };
}
