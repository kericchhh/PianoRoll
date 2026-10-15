// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useSelectionEdits } from '@/features/piano-roll/hooks/notes/useSelectionEdits';
import { useNoteActions } from '@/features/piano-roll/hooks/notes/useNoteActions';
import { useViewportActions } from '@/features/piano-roll/hooks/editor/useViewportActions';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { GestureMode, Note } from '@/features/piano-roll/types';

const first: Note = {
    id: 'a',
    pitch: 72,
    startTick: 120,
    durationTicks: 240,
    velocity: 80,
    selected: true,
};
const second: Note = { ...first, id: 'b', pitch: 70, startTick: 480 };

beforeEach(() => useNoteStore.setState(useNoteStore.getInitialState()));
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function selection(mode: GestureMode = 'idle') {
    const gestureModeRef = { current: mode };
    const hook = renderHook(() => {
        const actions = useNoteActions(1920);
        return {
            ...actions,
            ...useSelectionEdits({
                endTick: 1920,
                gestureModeRef,
                commitMove: actions.commitMove,
                commitResize: actions.commitResize,
            }),
        };
    });
    return { ...hook, gestureModeRef };
}

test('click edit actions preserve group spacing, selection and velocity, with one command and announcement per action', () => {
    const untouched = { ...first, id: 'c', selected: false };
    useNoteStore.setState({ notes: { a: first, b: second, c: untouched } });
    const hook = selection();
    const updates = vi.fn();
    const unsubscribe = useNoteStore.subscribe(updates);
    act(() => hook.result.current.moveSelection(120, -1));
    expect(updates).toHaveBeenCalledTimes(1);
    expect(useNoteStore.getState().notes).toEqual({
        a: { ...first, startTick: 240, pitch: 71 },
        b: { ...second, startTick: 600, pitch: 69 },
        c: untouched,
    });
    expect(useNoteStore.getState().undoStack).toHaveLength(1);
    expect(hook.result.current.announcement.text).toMatch(/Moved 2 notes/);
    const moved = useNoteStore.getState().notes;
    act(() => hook.result.current.resizeSelection(120));
    expect(useNoteStore.getState().notes.a.durationTicks).toBe(360);
    expect(useNoteStore.getState().notes.b.durationTicks).toBe(360);
    expect(useNoteStore.getState().undoStack).toHaveLength(2);
    expect(hook.result.current.announcement.text).toMatch(/Resized 2 notes/);
    act(() => {
        useNoteStore.getState().undo();
    });
    expect(useNoteStore.getState().notes).toEqual(moved);
    act(() => {
        useNoteStore.getState().undo();
    });
    expect(useNoteStore.getState().notes).toEqual({
        a: first,
        b: second,
        c: untouched,
    });
    unsubscribe();
});

test('selection edits use the current store selection rather than a captured selection', () => {
    useNoteStore.setState({
        notes: { a: first, b: { ...second, selected: false } },
    });
    const hook = selection();
    act(() => useNoteStore.getState().selectNote('b'));
    act(() => hook.result.current.moveSelection(0, 1));
    expect(useNoteStore.getState().notes.a).toEqual({
        ...first,
        selected: false,
    });
    expect(useNoteStore.getState().notes.b).toEqual({ ...second, pitch: 71 });
});

test('bound edits and an empty selection leave history and announcements untouched', () => {
    const bound = { ...first, pitch: 127, startTick: 0, durationTicks: 120 };
    useNoteStore.setState({ notes: { a: bound } });
    const hook = selection();
    const before = useNoteStore.getState();
    act(() => {
        hook.result.current.moveSelection(-120, 1);
        hook.result.current.resizeSelection(-120);
    });
    expect(useNoteStore.getState()).toBe(before);
    expect(hook.result.current.announcement.sequence).toBe(0);
    act(() => useNoteStore.getState().selectNotes([]));
    const empty = useNoteStore.getState();
    act(() => {
        hook.result.current.moveSelection(120, -1);
        hook.result.current.resizeSelection(120);
    });
    expect(useNoteStore.getState()).toBe(empty);
    expect(hook.result.current.announcement.sequence).toBe(0);
});

test.each<GestureMode>(['move', 'resize', 'pan', 'marquee', 'select'])(
    'click edit actions cannot race the active %s gesture',
    (mode) => {
        useNoteStore.setState({ notes: { a: first } });
        const hook = selection(mode);
        const before = useNoteStore.getState();
        act(() => {
            hook.result.current.moveSelection(120, 1);
            hook.result.current.resizeSelection(120);
        });
        expect(useNoteStore.getState()).toBe(before);
        expect(hook.result.current.announcement.sequence).toBe(0);
    },
);

function viewport(mode: GestureMode = 'idle') {
    const options = {
        scaleRef: { current: 0.5 },
        scrollRef: { current: 600 },
        width: 800,
        endTick: 7680,
        gestureModeRef: { current: mode },
        requestRedraw: vi.fn(),
        announce: vi.fn(),
    };
    let renders = 0;
    const hook = renderHook(() => {
        renders++;
        return useViewportActions(options);
    });
    return { ...hook, ...options, renders: () => renders };
}

test('zoom buttons preserve the center tick while pan buttons move half a viewport without note edits or React renders', () => {
    useNoteStore.setState({ notes: { a: first } });
    const before = useNoteStore.getState();
    const hook = viewport();
    const centerTick = 2000;
    act(() => hook.result.current.zoomIn());
    expect(hook.scaleRef.current).toBe(0.625);
    expect((400 + hook.scrollRef.current) / hook.scaleRef.current).toBe(
        centerTick,
    );
    act(() => hook.result.current.zoomOut());
    expect(hook.scaleRef.current).toBe(0.5);
    expect(hook.scrollRef.current).toBe(600);
    act(() => hook.result.current.panRight());
    expect(hook.scrollRef.current).toBe(1000);
    act(() => hook.result.current.panLeft());
    expect(hook.scrollRef.current).toBe(600);
    expect(hook.requestRedraw).toHaveBeenCalledTimes(4);
    expect(hook.announce).toHaveBeenCalledTimes(4);
    expect(useNoteStore.getState()).toBe(before);
    expect(hook.renders()).toBe(1);
});

test('viewport controls clamp both ends and zoom limits', () => {
    const hook = viewport();
    act(() => {
        for (let index = 0; index < 30; index++) hook.result.current.zoomIn();
    });
    expect(hook.scaleRef.current).toBe(2);
    act(() => {
        for (let index = 0; index < 50; index++) hook.result.current.panRight();
    });
    expect(hook.scrollRef.current).toBe(14560);
    act(() => {
        for (let index = 0; index < 50; index++) hook.result.current.panLeft();
    });
    expect(hook.scrollRef.current).toBe(0);
    act(() => {
        for (let index = 0; index < 30; index++) hook.result.current.zoomOut();
    });
    expect(hook.scaleRef.current).toBe(800 / 7680);
    expect(hook.scrollRef.current).toBe(0);
});

test.each<GestureMode>(['move', 'resize', 'pan', 'marquee', 'select'])(
    'viewport controls wait until the active %s gesture finishes',
    (mode) => {
        const hook = viewport(mode);
        act(() => {
            hook.result.current.zoomIn();
            hook.result.current.zoomOut();
            hook.result.current.panLeft();
            hook.result.current.panRight();
        });
        expect(hook.scaleRef.current).toBe(0.5);
        expect(hook.scrollRef.current).toBe(600);
        expect(hook.requestRedraw).not.toHaveBeenCalled();
        expect(hook.announce).not.toHaveBeenCalled();
    },
);
