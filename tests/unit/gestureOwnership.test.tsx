// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PointerEvent, MouseEvent } from 'react';
import { useDrag, useWheel } from '@use-gesture/react';
import { useNoteInteractions } from '@/features/piano-roll/hooks/notes/useNoteInteractions';
import { useZoomPan } from '@/features/piano-roll/hooks/editor/useZoomPan';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { Note } from '@/features/piano-roll/types';

vi.mock('@use-gesture/react', () => ({ useDrag: vi.fn(), useWheel: vi.fn() }));
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useNoteStore.setState({ notes: {} });
});

function setup() {
    const canvas = document.createElement('canvas');
    Object.defineProperties(canvas, {
        clientWidth: { value: 300 },
        clientHeight: { value: 120 },
    });
    const original: Note = {
        id: 'a',
        pitch: 72,
        startTick: 480,
        durationTicks: 120,
        selected: true,
        velocity: 100,
    };
    useNoteStore.setState({ notes: { a: original } });
    const canvasRef = { current: canvas };
    const scrollRef = { current: 120 },
        scaleRef = { current: 0.5 };
    const previewRef: { current: Record<string, Note> | null } = {
        current: null,
    };
    const dragCandidateRef: { current: Note | null } = { current: null };
    const marqueeRef = { current: null };
    const requestRedraw = vi.fn();
    const { result } = renderHook(() => {
        const interactions = useNoteInteractions({
            canvasRef,
            previewRef,
            dragCandidateRef,
            marqueeRef,
            width: 600,
            height: 240,
            endTick: 7680,
            requestRedraw,
            getView: () => ({
                pixelsPerTick: scaleRef.current,
                scrollOffsetX: scrollRef.current,
                highestVisiblePitch: 72,
                rowHeight: 20,
            }),
        });
        useZoomPan({
            canvasRef,
            scrollRef,
            scaleRef,
            width: 600,
            endTick: 7680,
            requestRedraw,
            gestureModeRef: interactions.gestureModeRef,
            dragScaleRef: interactions.dragScaleRef,
        });
        return interactions;
    });
    const move = vi.mocked(useDrag).mock.calls[0][0],
        pan = vi.mocked(useDrag).mock.calls[1][0];
    const wheel = vi.mocked(useWheel).mock.calls[0][0];
    function start(shiftKey = false) {
        act(() =>
            result.current.handleCanvasPointerDown({
                currentTarget: canvas,
                button: 0,
                clientX: 65,
                clientY: 5,
                shiftKey,
            } as PointerEvent<HTMLCanvasElement>),
        );
    }
    return {
        result,
        canvas,
        original,
        start,
        move,
        pan,
        wheel,
        scrollRef,
        scaleRef,
        previewRef,
        dragCandidateRef,
    };
}

test('a secondary button cannot steal an active note drag or discard its preview', () => {
    const { start, move, result, canvas, previewRef, dragCandidateRef } =
        setup();
    start();
    act(() =>
        move({ movement: [-30, 0], last: false } as Parameters<typeof move>[0]),
    );
    const preview = previewRef.current;
    const candidate = dragCandidateRef.current;
    act(() =>
        result.current.handleCanvasPointerDown({
            currentTarget: canvas,
            button: 2,
        } as PointerEvent<HTMLCanvasElement>),
    );
    expect(result.current.gestureModeRef.current).toBe('move');
    expect(previewRef.current).toBe(preview);
    expect(dragCandidateRef.current).toBe(candidate);
});

test('a fresh primary press clears an abandoned preview before starting a new gesture', () => {
    const { start, move, previewRef } = setup();
    start();
    act(() =>
        move({ movement: [-30, 0], last: false } as Parameters<typeof move>[0]),
    );
    expect(previewRef.current?.a).toBeDefined();
    start();
    expect(previewRef.current).toBeNull();
});

test('pressing Shift during a note drag cannot activate pan; scaled note movement stays logical', () => {
    const { start, move, pan, scrollRef, previewRef } = setup();
    start();
    const event = {
        type: 'pointermove',
        shiftKey: true,
        preventDefault: vi.fn(),
    };
    act(() =>
        move({ movement: [-30, 10], last: false, event } as Parameters<
            typeof move
        >[0]),
    );
    act(() =>
        pan({ delta: [-30, 10], last: false, event } as Parameters<
            typeof pan
        >[0]),
    );
    expect(scrollRef.current).toBe(120);
    expect(previewRef.current?.a).toMatchObject({ startTick: 360, pitch: 71 });
});

test('releasing Shift during pan retains pan ownership and prevents a generated add click', () => {
    const { start, pan, result, canvas, scrollRef, original } = setup();
    start(true);
    const event = {
        type: 'pointermove',
        shiftKey: false,
        preventDefault: vi.fn(),
    };
    act(() =>
        pan({ delta: [-30, 0], last: true, event } as Parameters<
            typeof pan
        >[0]),
    );
    expect(scrollRef.current).toBe(180);
    expect(result.current.gestureModeRef.current).toBe('idle');
    act(() =>
        result.current.handleCanvasClick({
            currentTarget: canvas,
            clientX: 100,
            clientY: 80,
        } as MouseEvent<HTMLCanvasElement>),
    );
    expect(useNoteStore.getState().notes).toEqual({ a: original });
});

test('zoom is blocked during a drag and uses logical coordinates after release', () => {
    const { start, wheel, result, scaleRef, scrollRef } = setup();
    start();
    const event = {
        ctrlKey: true,
        clientX: 50,
        clientY: 0,
        preventDefault: vi.fn(),
    };
    act(() =>
        wheel({ delta: [0, -100], event, last: false } as Parameters<
            typeof wheel
        >[0]),
    );
    expect(scaleRef.current).toBe(0.5);
    act(() => {
        result.current.gestureModeRef.current = 'idle';
    });
    act(() =>
        wheel({ delta: [0, -100], event, last: false } as Parameters<
            typeof wheel
        >[0]),
    );
    expect(scaleRef.current).toBeCloseTo(0.5 * Math.exp(0.2));
    expect((100 + scrollRef.current) / scaleRef.current).toBeCloseTo(
        (100 + 120) / 0.5,
    );
});
