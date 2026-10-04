// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { useDrag } from '@use-gesture/react';
import type { MouseEvent, PointerEvent } from 'react';
import { PianoRollCanvas } from '@/features/piano-roll/components/PianoRollCanvas';
import { useNoteInteractions } from '@/features/piano-roll/hooks/useNoteInteractions';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { MarqueeRect, Note } from '@/features/piano-roll/types';

vi.mock('@use-gesture/react', () => ({ useDrag: vi.fn(), useWheel: vi.fn() }));

const notes: Record<string, Note> = {
  a: {
    id: 'a',
    pitch: 71,
    startTick: 80,
    durationTicks: 120,
    velocity: 100,
    selected: false,
  },
  b: {
    id: 'b',
    pitch: 70,
    startTick: 240,
    durationTicks: 120,
    velocity: 100,
    selected: false,
  },
  c: {
    id: 'c',
    pitch: 60,
    startTick: 360,
    durationTicks: 120,
    velocity: 100,
    selected: true,
  },
};

beforeEach(() => useNoteStore.setState({ notes }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setCanvasSize(canvas: HTMLElement, width = 600, height = 240) {
  Object.defineProperties(canvas, {
    clientWidth: { configurable: true, value: width },
    clientHeight: { configurable: true, value: height },
  });
}

function setup(clientWidth = 600, clientHeight = 240) {
  const canvas = document.createElement('canvas');
  setCanvasSize(canvas, clientWidth, clientHeight);
  const marqueeRef: { current: MarqueeRect | null } = { current: null };
  const requestRedraw = vi.fn();
  const { result } = renderHook(() =>
    useNoteInteractions({
      canvasRef: { current: canvas },
      width: 600,
      height: 240,
      endTick: 480,
      dragCandidateRef: { current: null },
      previewRef: { current: null },
      marqueeRef,
      requestRedraw,
      getView: () => ({
        pixelsPerTick: 0.5,
        scrollOffsetX: 0,
        highestVisiblePitch: 72,
        rowHeight: 20,
      }),
    }),
  );
  const handler = vi.mocked(useDrag).mock.calls[0]?.[0];
  if (!handler) throw new Error('Drag handler was not registered');

  function pointerDown(
    clientX: number,
    clientY: number,
    modifiers: {
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
      button?: number;
    } = { ctrlKey: true },
  ) {
    act(() =>
      result.current.handleCanvasPointerDown({
        currentTarget: canvas,
        clientX,
        clientY,
        button: 0,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        ...modifiers,
      } as PointerEvent<HTMLCanvasElement>),
    );
  }

  function drag(
    movement: [number, number],
    update: {
      last?: boolean;
      tap?: boolean;
      canceled?: boolean;
      event?: { type: string };
    } = {},
  ) {
    act(() =>
      handler({
        movement,
        last: false,
        tap: false,
        canceled: false,
        ...update,
      } as Parameters<typeof handler>[0]),
    );
  }

  return { canvas, result, marqueeRef, requestRedraw, pointerDown, drag };
}

test('Ctrl-drag previews without store updates, then replaces selection once on release', () => {
  const { canvas, result, marqueeRef, pointerDown, drag } = setup();
  const updates = vi.fn();
  const unsubscribe = useNoteStore.subscribe(updates);
  pointerDown(50, 0);
  drag([120, 55]);

  expect(marqueeRef.current).toEqual({
    startX: 50,
    startY: 0,
    endX: 170,
    endY: 55,
  });
  expect(useNoteStore.getState().notes).toBe(notes);
  expect(updates).not.toHaveBeenCalled();

  drag([120, 55], { last: true });
  unsubscribe();
  const selected = useNoteStore.getState().notes;
  expect(selected.a.selected).toBe(true);
  expect(selected.b.selected).toBe(true);
  expect(selected.c.selected).toBe(false);
  expect(updates).toHaveBeenCalledOnce();
  expect(marqueeRef.current).toBeNull();
  expect(result.current.alert).toBe('2 notes selected');

  act(() =>
    result.current.handleCanvasClick({
      currentTarget: canvas,
      clientX: 130,
      clientY: 45,
      ctrlKey: true,
    } as MouseEvent<HTMLCanvasElement>),
  );
  expect(useNoteStore.getState().notes).toBe(selected);
});

test('Command-drag supports reverse direction and a release-only gesture', () => {
  const { pointerDown, drag, marqueeRef } = setup();
  pointerDown(190, 65, { metaKey: true });
  drag([-165, -60], { last: true });

  expect(useNoteStore.getState().notes.a.selected).toBe(true);
  expect(useNoteStore.getState().notes.b.selected).toBe(true);
  expect(useNoteStore.getState().notes.c.selected).toBe(false);
  expect(marqueeRef.current).toBeNull();
});

test('scales screen-space movement to logical canvas coordinates', () => {
  const { pointerDown, drag, marqueeRef } = setup(300, 120);
  pointerDown(25, 0);
  drag([60, 27.5]);

  expect(marqueeRef.current).toEqual({
    startX: 50,
    startY: 0,
    endX: 170,
    endY: 55,
  });
  drag([60, 27.5], { last: true });
  expect(useNoteStore.getState().notes.a.selected).toBe(true);
  expect(useNoteStore.getState().notes.b.selected).toBe(true);
});

test('clamps the rectangle to viewport and timeline bounds', () => {
  const { pointerDown, drag, marqueeRef } = setup();
  pointerDown(50, 0);
  drag([1000, 1000]);
  expect(marqueeRef.current).toEqual({
    startX: 50,
    startY: 0,
    endX: 240,
    endY: 240,
  });
  drag([-1000, -1000]);
  expect(marqueeRef.current).toEqual({
    startX: 50,
    startY: 0,
    endX: 0,
    endY: 0,
  });
});

test('a modifier-click on empty grid neither adds notes nor clears selection', () => {
  const { canvas, result, pointerDown, drag, marqueeRef } = setup();
  pointerDown(50, 0);
  drag([1, 1], { last: true, tap: true });
  act(() =>
    result.current.handleCanvasClick({
      currentTarget: canvas,
      clientX: 51,
      clientY: 1,
      ctrlKey: true,
    } as MouseEvent<HTMLCanvasElement>),
  );

  expect(marqueeRef.current).toBeNull();
  expect(useNoteStore.getState().notes).toBe(notes);
});

test.each([{ canceled: true }, { event: { type: 'pointercancel' } }])(
  'cancellation discards the rectangle without committing selection: %j',
  (update) => {
    const { pointerDown, drag, marqueeRef } = setup();
    pointerDown(50, 0);
    drag([120, 55]);
    drag([120, 55], { last: true, ...update });

    expect(marqueeRef.current).toBeNull();
    expect(useNoteStore.getState().notes).toBe(notes);
  },
);

test('Ctrl-click on a note still toggles it rather than starting a marquee', () => {
  const { canvas, result, pointerDown, drag, marqueeRef } = setup();
  pointerDown(50, 25);
  drag([1, 1], { last: true, tap: true });
  act(() =>
    result.current.handleCanvasClick({
      currentTarget: canvas,
      clientX: 50,
      clientY: 25,
      ctrlKey: true,
    } as MouseEvent<HTMLCanvasElement>),
  );

  expect(marqueeRef.current).toBeNull();
  expect(useNoteStore.getState().notes.a.selected).toBe(true);
  expect(useNoteStore.getState().notes.c.selected).toBe(true);
});

test.each([
  {},
  { ctrlKey: true, shiftKey: true },
  { ctrlKey: true, button: 2 },
])(
  'ordinary, Shift-pan, and right-button drags do not start marquee selection: %j',
  (modifiers) => {
    const { pointerDown, drag, marqueeRef } = setup();
    pointerDown(50, 0, modifiers);
    drag([120, 55], { last: true });

    expect(marqueeRef.current).toBeNull();
    expect(useNoteStore.getState().notes).toBe(notes);
  },
);

test('a drag beginning beyond the timeline cannot start a marquee', () => {
  const { pointerDown, drag, marqueeRef } = setup();
  pointerDown(300, 0);
  drag([-250, 55], { last: true });

  expect(marqueeRef.current).toBeNull();
  expect(useNoteStore.getState().notes).toBe(notes);
});

test('a rectangle with no overlapping notes clears selection on release', () => {
  const { pointerDown, drag, result } = setup();
  pointerDown(5, 0);
  drag([20, 10], { last: true });

  expect(
    Object.values(useNoteStore.getState().notes).every(
      (note) => !note.selected,
    ),
  ).toBe(true);
  expect(result.current.alert).toBe('0 notes selected');
});

test('canvas draws the marquee above notes and focuses the editor for keyboard operations', () => {
  const context = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement) {
      return this.getAttribute('aria-label') === 'Time grid preview'
        ? (context as unknown as CanvasRenderingContext2D)
        : null;
    },
  );
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  render(<PianoRollCanvas />);
  const canvas = screen.getByRole('img', { name: 'Time grid preview' });
  setCanvasSize(canvas);
  fireEvent.pointerDown(canvas, {
    button: 0,
    pointerId: 1,
    clientX: 50,
    clientY: 0,
    ctrlKey: true,
  });
  const handler = vi.mocked(useDrag).mock.calls[0]?.[0];
  if (!handler) throw new Error('Drag handler was not registered');
  act(() =>
    handler({ movement: [120, 55], last: false, tap: false } as Parameters<
      typeof handler
    >[0]),
  );
  act(() => frame?.(0));

  expect(context.fillRect).toHaveBeenLastCalledWith(50, 0, 120, 55);
  expect(context.strokeRect).toHaveBeenLastCalledWith(50, 0, 120, 55);
  expect(context.save).toHaveBeenCalledOnce();
  expect(context.restore).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(
    screen.getByRole('group', { name: 'Piano roll editor' }),
  );
});
