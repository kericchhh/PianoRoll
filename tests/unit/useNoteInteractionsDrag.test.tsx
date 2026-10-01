// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useDrag } from '@use-gesture/react';
import { useNoteInteractions } from '@/features/piano-roll/hooks/useNoteInteractions';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { Note } from '@/features/piano-roll/types';

vi.mock('@use-gesture/react', () => ({ useDrag: vi.fn() }));

const original: Note = {
  id: 'note', pitch: 60, startTick: 120, durationTicks: 120,
  velocity: 100, selected: false,
};

beforeEach(() => useNoteStore.setState({ notes: {} }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function startDrag(note: Note) {
  useNoteStore.getState().addNote(note);
  const dragCandidateRef: { current: Note | null } = { current: note };
  const previewRef: { current: Note | null } = { current: null };
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
  expect(previewRef.current).toMatchObject({ startTick: 360, pitch: 127 });
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
