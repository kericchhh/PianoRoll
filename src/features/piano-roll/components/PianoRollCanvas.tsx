import {
  useRef,
  useEffect,
  useState,
  useId,
  useMemo,
  useCallback,
} from 'react';
import { clampScroll } from '@/features/piano-roll/utils/clampScroll';
import { clampScale } from '@/features/piano-roll/utils/clampScale';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type {
  PianoRollView,
  Note,
  MarqueeRect,
  NoteRegion,
} from '@/features/piano-roll/types';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { NoteContextMenuContent } from '@/features/piano-roll/components/NoteContextMenuContent';
import { useNoteInteractions } from '@/features/piano-roll/hooks/useNoteInteractions';
import { useZoomPan } from '@/features/piano-roll/hooks/useZoomPan';
import {
  BAR_COUNTS,
  BEATS_PER_BAR,
  PPQ,
  INITIAL_BAR_COUNT,
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT,
  ROW_HEIGHT,
  INITIAL_HIGHEST_PITCH,
} from '@/features/piano-roll/constants';
import {
  createNoteIndex,
  queryNoteIndex,
} from '@/features/piano-roll/utils/noteIndex';
import { revealNotes } from '@/features/piano-roll/utils/revealNotes';
import { useCanvasRenderer } from '@/features/piano-roll/hooks/useCanvasRenderer';
import { NoteInsertionForm } from '@/features/piano-roll/components/NoteInsertionForm';
import { NoteList } from '@/features/piano-roll/components/NoteList';

export function PianoRollCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(0.5);
  const scrollRef = useRef(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const activeNoteRef = useRef<string | null>(null);
  const highestPitchRef = useRef(INITIAL_HIGHEST_PITCH);
  const dragCandidateRef = useRef<Note | null>(null);
  const previewRef = useRef<Record<string, Note> | null>(null);
  const marqueeRef = useRef<MarqueeRect | null>(null);
  const instructionsId = useId();
  const [barCount, setBarCount] = useState(INITIAL_BAR_COUNT);
  const endTick = barCount * BEATS_PER_BAR * PPQ;
  const width = VIEWPORT_WIDTH;
  const height = VIEWPORT_HEIGHT;
  const notes = useNoteStore((state) => state.notes);
  const getPianoRollView = useCallback((): PianoRollView => {
    return {
      pixelsPerTick: scaleRef.current,
      scrollOffsetX: scrollRef.current,
      highestVisiblePitch: highestPitchRef.current,
      rowHeight: ROW_HEIGHT,
    };
  }, []);
  const index = useMemo(() => createNoteIndex(notes), [notes]);
  const queryNotes = useCallback(
    (region: NoteRegion) => queryNoteIndex(index, region),
    [index],
  );
  const requestRedraw = useCanvasRenderer({
    canvasRef,
    overlayRef,
    activeNoteRef,
    previewRef,
    marqueeRef,
    index,
    getView: getPianoRollView,
    width,
    height,
    endTick,
  });
  const onReveal = useCallback(
    (moved: readonly Note[]) => {
      const view = revealNotes(
        moved,
        getPianoRollView(),
        width,
        height,
        endTick,
      );
      scrollRef.current = view.scrollOffsetX;
      highestPitchRef.current = view.highestVisiblePitch;
      requestRedraw();
    },
    [endTick, getPianoRollView, height, requestRedraw, width],
  );
  const {
    menuNoteId,
    handleCanvasClick,
    handleCanvasContextMenu,
    handleEditorKeyDown,
    deleteNote,
    selectNote,
    announcement,
    activeNoteId,
    addNote,
    handleCanvasPointerDown,
    gestureModeRef,
    dragScaleRef,
  } = useNoteInteractions({
    canvasRef,
    getView: getPianoRollView,
    width,
    height,
    endTick,
    dragCandidateRef,
    previewRef,
    marqueeRef,
    requestRedraw,
    onReveal,
    queryNotes,
    surfaceRef,
  });

  useZoomPan({
    canvasRef,
    surfaceRef,
    scaleRef,
    scrollRef,
    endTick,
    width,
    requestRedraw,
    gestureModeRef,
    dragScaleRef,
  });
  const activeNote = activeNoteId ? notes[activeNoteId] : undefined;
  const selectedNote = activeNote?.selected ? activeNote : index.selected[0];
  useEffect(() => {
    activeNoteRef.current = selectedNote?.id ?? null;
    requestRedraw();
  }, [selectedNote, requestRedraw]);
  useEffect(() => {
    scaleRef.current = clampScale(scaleRef.current, endTick, width);
    scrollRef.current = clampScroll(
      scrollRef.current,
      endTick,
      scaleRef.current,
      width,
    );
    requestRedraw();
  }, [endTick, requestRedraw, width]);

  return (
    <>
      <label>
        Timeline length
        <select
          value={barCount}
          onChange={(event) => setBarCount(Number(event.target.value))}
          className="ml-2 border focus-visible:outline-2"
        >
          {BAR_COUNTS.map((bars) => (
            <option key={bars} value={bars}>
              {bars} bars
            </option>
          ))}
        </select>
      </label>
      <NoteInsertionForm endTick={endTick} onAdd={addNote} />
      <div
        ref={editorRef}
        role="group"
        aria-label="Piano roll editor"
        aria-describedby={instructionsId}
        tabIndex={0}
        onKeyDown={handleEditorKeyDown}
        className="group focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <ContextMenu.Root>
          <ContextMenu.Trigger asChild>
            <div
              ref={surfaceRef}
              className="relative w-fit touch-none select-none"
              onClick={(event) => {
                handleCanvasClick(event);
                editorRef.current?.focus({ preventScroll: true });
              }}
              onContextMenuCapture={handleCanvasContextMenu}
              onPointerDown={(event) => {
                handleCanvasPointerDown(event);
                editorRef.current?.focus({ preventScroll: true });
              }}
            >
              <canvas
                ref={canvasRef}
                role="img"
                aria-label="Time grid preview"
                className="block border border-slate-600 select-none"
              />
              {selectedNote && (
                <div
                  ref={overlayRef}
                  data-note-overlay
                  tabIndex={0}
                  role="group"
                  aria-label={`Selected note: pitch ${selectedNote.pitch}, tick ${selectedNote.startTick}, duration ${selectedNote.durationTicks} ticks`}
                  aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Delete"
                  className="absolute outline-2 outline-offset-1 outline-transparent group-focus-within:outline-blue-950 focus-visible:outline-blue-950"
                >
                  <span className="sr-only">
                    Use arrow keys to move this selection, or Delete to remove
                    it.
                  </span>
                </div>
              )}
            </div>
          </ContextMenu.Trigger>
          <NoteContextMenuContent
            noteId={menuNoteId}
            onSelectNote={(id) => selectNote(id)}
            onDeleteNote={deleteNote}
          />
        </ContextMenu.Root>
        <p id={instructionsId} className="sr-only">
          Ctrl or Command-click toggles a note. Ctrl or Command-drag empty grid
          selects overlapping notes. Use the note-list buttons to toggle
          selection with the keyboard, arrow keys to move selected notes, and
          Delete to remove them. Use the New note pitch and Start tick fields
          followed by Add note to insert a note.
        </p>
        <NoteList notes={notes} onSelect={selectNote} />
        <p role="status" aria-atomic="true" className="sr-only">
          <span key={announcement.sequence}>{announcement.text}</span>
        </p>
      </div>
    </>
  );
}
