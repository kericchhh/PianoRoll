// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useDrag } from '@use-gesture/react';
import { useNoteInteractions } from '@/features/piano-roll/hooks/useNoteInteractions';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { PianoRollCanvas } from '@/features/piano-roll/components/PianoRollCanvas';
import type { Note } from '@/features/piano-roll/types';

vi.mock('@use-gesture/react', () => ({ useDrag: vi.fn(), useWheel: vi.fn() }));

const original: Note = {
  id: 'note', pitch: 60, startTick: 120, durationTicks: 120,
  velocity: 100, selected: true,
};

beforeEach(() => useNoteStore.setState({ notes: {} }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function startDrag(note: Note, otherNotes: Note[] = []) {
  useNoteStore.getState().addNote(note);
  for (const other of otherNotes) useNoteStore.getState().addNote(other);
  const dragCandidateRef: { current: Note | null } = { current: note };
  const previewRef: { current: Record<string, Note> | null } = { current: null };
  const requestRedraw = vi.fn();
  const { result } = renderHook(() => useNoteInteractions({
    canvasRef: { current: null }, width: 600, height: 240,
    getView: () => ({
      pixelsPerTick: 0.5, scrollOffsetX: 0,
      highestVisiblePitch: 72, rowHeight: 20,
    }),
    endTick: 480, dragCandidateRef, previewRef, requestRedraw,
  }));

  const drag = vi.mocked(useDrag).mock.calls[0]?.[0];
  if (!drag) throw new Error('Drag handler was not registered');
  return { drag, dragCandidateRef, previewRef, requestRedraw, result };
}

test('keeps the stored note in place during drag, then commits the bounded preview', () => {
  const { drag, dragCandidateRef, previewRef, requestRedraw, result } = startDrag(original);

  act(() => drag({ movement: [1000, -2000], last: false } as Parameters<typeof drag>[0]));
  expect(previewRef.current?.note).toMatchObject({ startTick: 360, pitch: 127 });
  expect(useNoteStore.getState().notes.note).toEqual(original);

  act(() => drag({ movement: [1000, -2000], last: true } as Parameters<typeof drag>[0]));
  expect(useNoteStore.getState().notes.note).toMatchObject({ startTick: 360, pitch: 127 });
  expect(previewRef.current).toBeNull();
  expect(dragCandidateRef.current).toBeNull();
  expect(requestRedraw).toHaveBeenCalledTimes(2);
  expect(result.current.alert).toMatch(/moved pitch 60 to 127 at tick 360/i);
});

test('commits the final displacement even without an earlier preview frame', () => {
  const { drag } = startDrag(original);

  act(() => drag({ movement: [60, 20], last: true, tap: false } as Parameters<typeof drag>[0]));

  expect(useNoteStore.getState().notes.note).toMatchObject({ startTick: 240, pitch: 59 });
});

test('a tap does not move an unsnapped note', () => {
  const note = { ...original, startTick: 65 };
  const { drag } = startDrag(note);

  act(() => drag({ movement: [2, 0], last: true, tap: true } as Parameters<typeof drag>[0]));

  expect(useNoteStore.getState().notes.note).toEqual(note);
});

test('dragging a selected note previews and commits the whole group together', () => {
  const other = { ...original, id: 'other', startTick: 240, pitch: 64 };
  const { drag, previewRef, result } = startDrag(original, [other]);
  const updates = vi.fn();
  const unsubscribe = useNoteStore.subscribe(updates);

  act(() => drag({ movement: [1000, 20], last: false } as Parameters<typeof drag>[0]));
  expect(previewRef.current?.note).toMatchObject({ startTick: 240, pitch: 59 });
  expect(previewRef.current?.other).toMatchObject({ startTick: 360, pitch: 63 });
  expect(updates).not.toHaveBeenCalled();

  act(() => drag({ movement: [1000, 20], last: true } as Parameters<typeof drag>[0]));
  unsubscribe();
  expect(updates).toHaveBeenCalledTimes(1);
  expect(useNoteStore.getState().notes.note).toMatchObject({ startTick: 240, pitch: 59 });
  expect(useNoteStore.getState().notes.other).toMatchObject({ startTick: 360, pitch: 63 });
  expect(previewRef.current).toBeNull();
  expect(result.current.alert).toBe('Moved 2 notes');
});

test('dragging an unselected note selects and moves only that note', () => {
  const note = { ...original, selected: false };
  const other = { ...original, id: 'other', pitch: 64 };
  const { drag } = startDrag(note, [other]);

  act(() => drag({ movement: [60, 0], last: true } as Parameters<typeof drag>[0]));

  expect(useNoteStore.getState().notes.note).toMatchObject({ startTick: 240, selected: true });
  expect(useNoteStore.getState().notes.other).toMatchObject({ startTick: 120, selected: false });
});

test('all origin ghosts are drawn beneath the moving notes when their positions overlap', () => {
  const rectangles: [string, number, number][] = [];
  const context = {
    fillStyle: '',
    setTransform: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), strokeRect: vi.fn(),
    clearRect: () => { rectangles.length = 0; },
    fillRect: (x: number, y: number) => { rectangles.push([context.fillStyle, x, y]); },
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context as unknown as CanvasRenderingContext2D);
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  useNoteStore.getState().addNote({ ...original, id: 'a', pitch: 72 });
  useNoteStore.getState().addNote({ ...original, id: 'b', startTick: 240, pitch: 71 });
  render(<PianoRollCanvas />);
  const canvas = screen.getByRole('img', { name: 'Time grid preview' });
  Object.defineProperties(canvas, {
    clientWidth: { configurable: true, value: 600 },
    clientHeight: { configurable: true, value: 240 },
  });
  fireEvent.pointerDown(canvas, { button: 0, pointerId: 1, clientX: 65, clientY: 10 });
  const drag = vi.mocked(useDrag).mock.calls[0]?.[0];
  if (!drag) throw new Error('Drag handler was not registered');

  act(() => drag({ movement: [60, 20], last: false } as Parameters<typeof drag>[0]));
  act(() => frame?.(0));

  expect(rectangles).toEqual([
    ['#94a3b8', 60, 0], ['#94a3b8', 120, 20],
    ['#2563eb', 120, 20], ['#2563eb', 180, 40],
  ]);
});
