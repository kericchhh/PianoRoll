// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { MouseEvent, PointerEvent } from 'react';
import { useDrag, useWheel } from '@use-gesture/react';
import { useNoteInteractions } from '@/features/piano-roll/hooks/useNoteInteractions';
import { useZoomPan } from '@/features/piano-roll/hooks/useZoomPan';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { Note } from '@/features/piano-roll/types';

vi.mock('@use-gesture/react', () => ({ useDrag: vi.fn(), useWheel: vi.fn() }));

const original: Note = {
    id: 'a',
    pitch: 72,
    startTick: 120,
    durationTicks: 120,
    velocity: 100,
    selected: true,
};

beforeEach(() => useNoteStore.setState({ notes: {} }));
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

function setup(notes: Note[] = [original], cssWidth = 600, endTick = 480) {
    useNoteStore.setState({
        notes: Object.fromEntries(notes.map((note) => [note.id, note])),
    });
    const canvas = document.createElement('canvas');
    Object.defineProperties(canvas, {
        clientWidth: { value: cssWidth },
        clientHeight: { value: 240 },
    });
    const canvasRef = { current: canvas };
    const previewRef: { current: Record<string, Note> | null } = {
        current: null,
    };
    const dragCandidateRef: { current: Note | null } = { current: null };
    const scaleRef = { current: 0.5 };
    const scrollRef = { current: 0 };
    const requestRedraw = vi.fn();
    const onReveal = vi.fn();
    const { result } = renderHook(() => {
        const interactions = useNoteInteractions({
            canvasRef,
            width: 600,
            height: 240,
            getView: () => ({
                pixelsPerTick: scaleRef.current,
                scrollOffsetX: scrollRef.current,
                highestVisiblePitch: 72,
                rowHeight: 20,
            }),
            endTick,
            dragCandidateRef,
            previewRef,
            marqueeRef: { current: null },
            requestRedraw,
            onReveal,
        });
        useZoomPan({
            canvasRef,
            scaleRef,
            scrollRef,
            endTick,
            width: 600,
            requestRedraw,
            gestureModeRef: interactions.gestureModeRef,
            dragScaleRef: interactions.dragScaleRef,
        });
        return interactions;
    });
    const drag = vi.mocked(useDrag).mock.calls[0][0];
    const pan = vi.mocked(useDrag).mock.calls[1][0];
    const wheel = vi.mocked(useWheel).mock.calls[0][0];
    function press(
        x = 115,
        modifiers: { ctrlKey?: boolean; shiftKey?: boolean } = {},
    ) {
        act(() =>
            result.current.handleCanvasPointerDown({
                currentTarget: canvas,
                button: 0,
                clientX: x,
                clientY: 10,
                ...modifiers,
            } as PointerEvent<HTMLCanvasElement>),
        );
    }
    return {
        result,
        drag,
        pan,
        wheel,
        press,
        canvas,
        previewRef,
        dragCandidateRef,
        requestRedraw,
        onReveal,
        scaleRef,
        scrollRef,
    };
}

test('a right-edge drag previews duration in refs and commits the whole selection once', () => {
    const other = { ...original, id: 'b', startTick: 240, pitch: 71 };
    const unrelated = { ...original, id: 'c', pitch: 60, selected: false };
    const { press, drag, result, previewRef, dragCandidateRef, onReveal } =
        setup([original, other, unrelated]);
    press();
    expect(result.current.gestureModeRef.current).toBe('resize');
    const before = useNoteStore.getState();
    const updates = vi.fn();
    const unsubscribe = useNoteStore.subscribe(updates);

    act(() =>
        drag({ movement: [1000, 1000], last: false } as Parameters<
            typeof drag
        >[0]),
    );
    expect(previewRef.current).toEqual({
        a: { ...original, durationTicks: 240 },
        b: { ...other, durationTicks: 240 },
    });
    expect(useNoteStore.getState()).toBe(before);
    expect(updates).not.toHaveBeenCalled();

    act(() =>
        drag({ movement: [1000, 1000], last: true } as Parameters<
            typeof drag
        >[0]),
    );
    unsubscribe();
    expect(updates).toHaveBeenCalledTimes(1);
    expect(useNoteStore.getState().notes.a).toEqual({
        ...original,
        durationTicks: 240,
    });
    expect(useNoteStore.getState().notes.b).toEqual({
        ...other,
        durationTicks: 240,
    });
    expect(useNoteStore.getState().notes.c).toBe(before.notes.c);
    expect(previewRef.current).toBeNull();
    expect(dragCandidateRef.current).toBeNull();
    expect(result.current.gestureModeRef.current).toBe('idle');
    expect(result.current.alert).toMatch(/resized 2 notes/i);
    expect(onReveal).toHaveBeenCalledTimes(1);
});

test('the release displacement is committed even without a preview, using xy minus initial', () => {
    const { press, drag } = setup();
    press();
    act(() =>
        drag({
            movement: [25, 200],
            xy: [175, 210],
            initial: [115, 10],
            last: true,
        } as Parameters<typeof drag>[0]),
    );

    expect(useNoteStore.getState().notes.a).toEqual({
        ...original,
        durationTicks: 240,
    });
});

test('pointer snapping anchors the endpoint of an unsnapped note', () => {
    const note = { ...original, startTick: 65, durationTicks: 130 };
    const { press, drag } = setup([note]);
    press(95);
    act(() =>
        drag({ movement: [30, 20], last: true } as Parameters<typeof drag>[0]),
    );

    expect(useNoteStore.getState().notes.a).toEqual({
        ...note,
        durationTicks: 175,
    });
});

test('vertical displacement and right-edge taps never snap an unchanged endpoint', () => {
    const note = { ...original, startTick: 65, durationTicks: 130 };
    const { press, drag, result } = setup([note]);
    press(95);
    const before = useNoteStore.getState();
    act(() =>
        drag({ movement: [0, 40], last: true } as Parameters<typeof drag>[0]),
    );
    expect(useNoteStore.getState()).toBe(before);
    expect(result.current.alert).toBe('');
    press(95);
    act(() =>
        drag({ movement: [2, 0], last: true, tap: true } as Parameters<
            typeof drag
        >[0]),
    );
    expect(useNoteStore.getState()).toBe(before);
});

test.each(['canceled', 'pointercancel'] as const)(
    '%s discards a resize preview and its generated click',
    (interruption) => {
        const {
            press,
            drag,
            previewRef,
            dragCandidateRef,
            result,
            canvas,
            onReveal,
        } = setup();
        press();
        act(() =>
            drag({ movement: [60, 0], last: false } as Parameters<
                typeof drag
            >[0]),
        );
        expect(previewRef.current?.a.durationTicks).toBe(240);
        act(() =>
            drag({
                movement: [60, 0],
                last: true,
                canceled: interruption === 'canceled',
                event: {
                    type:
                        interruption === 'pointercancel'
                            ? 'pointercancel'
                            : 'pointermove',
                },
            } as Parameters<typeof drag>[0]),
        );
        act(() =>
            result.current.handleCanvasClick({
                currentTarget: canvas,
                clientX: 180,
                clientY: 10,
            } as MouseEvent<HTMLCanvasElement>),
        );

        expect(useNoteStore.getState().notes).toEqual({ a: original });
        expect(previewRef.current).toBeNull();
        expect(dragCandidateRef.current).toBeNull();
        expect(result.current.gestureModeRef.current).toBe('idle');
        expect(result.current.alert).toBe('');
        expect(onReveal).not.toHaveBeenCalled();
    },
);

test('an unselected edge selects and resizes only its note', () => {
    const note = { ...original, selected: false };
    const other = { ...original, id: 'b', pitch: 71 };
    const { press, drag } = setup([note, other]);
    press();
    act(() =>
        drag({ movement: [60, 0], last: true } as Parameters<typeof drag>[0]),
    );

    expect(useNoteStore.getState().notes.a).toEqual({
        ...note,
        selected: true,
        durationTicks: 240,
    });
    expect(useNoteStore.getState().notes.b).toEqual({
        ...other,
        selected: false,
    });
});

test('a scaled right-edge target and displacement both use CSS coordinates', () => {
    const { press, drag, result } = setup([original], 300);
    press(55); // Five CSS pixels from the endpoint at x=60.
    expect(result.current.gestureModeRef.current).toBe('resize');
    act(() =>
        drag({ movement: [30, 20], last: true } as Parameters<typeof drag>[0]),
    );

    expect(useNoteStore.getState().notes.a).toEqual({
        ...original,
        durationTicks: 240,
    });
});

test('a clipped overlay edge cannot resize a true endpoint outside the viewport', () => {
    const note = { ...original, durationTicks: 1088 }; // Actual endpoint is x=604.
    const { press, drag, result } = setup([note], 600, 7680);
    press(599); // Within the handle tolerance, but the endpoint is not visible.
    expect(result.current.gestureModeRef.current).toBe('move');
    act(() =>
        drag({ movement: [60, 0], last: true } as Parameters<typeof drag>[0]),
    );

    expect(useNoteStore.getState().notes.a).toEqual({
        ...note,
        startTick: 240,
    });
});

test('the exact shared endpoint targets the adjacent note for movement', () => {
    const adjacent = { ...original, id: 'b', startTick: 240, selected: false };
    const { press, result, dragCandidateRef } = setup([original, adjacent]);
    press(120);

    expect(dragCandidateRef.current?.id).toBe('b');
    expect(result.current.gestureModeRef.current).toBe('move');
});

test('resize ownership blocks pan and wheel zoom even if Shift is pressed mid-drag', () => {
    const { press, drag, pan, wheel, previewRef, scaleRef, scrollRef } =
        setup();
    press();
    const event = {
        type: 'pointermove',
        shiftKey: true,
        ctrlKey: true,
        preventDefault: vi.fn(),
    };
    act(() =>
        drag({ movement: [60, 0], last: false, event } as Parameters<
            typeof drag
        >[0]),
    );
    act(() =>
        pan({ delta: [60, 0], last: false, event } as Parameters<
            typeof pan
        >[0]),
    );
    act(() =>
        wheel({ delta: [0, -100], last: false, event } as Parameters<
            typeof wheel
        >[0]),
    );

    expect(previewRef.current?.a.durationTicks).toBe(240);
    expect(scaleRef.current).toBe(0.5);
    expect(scrollRef.current).toBe(0);
});

test('modifier clicks preserve selection and pan routing at the right edge', () => {
    const { press, result, dragCandidateRef } = setup();
    press(115, { ctrlKey: true });
    expect(result.current.gestureModeRef.current).toBe('select');
    expect(dragCandidateRef.current).toBeNull();
    press(115, { shiftKey: true });
    expect(result.current.gestureModeRef.current).toBe('pan');
    expect(dragCandidateRef.current).toBeNull();
});
