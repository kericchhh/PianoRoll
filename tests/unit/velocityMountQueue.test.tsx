import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useVelocityMountQueue } from '@/features/piano-roll/hooks/velocity/useVelocityMountQueue';
import type { Note } from '@/features/piano-roll/types';

let nextFrame: number;
let frames: Map<number, FrameRequestCallback>;
let cancelFrame: ReturnType<typeof vi.fn>;

beforeEach(() => {
    nextFrame = 0;
    frames = new Map();
    cancelFrame = vi.fn((id: number) => frames.delete(id));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        frames.set(++nextFrame, callback);
        return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

function notes(count: number): Note[] {
    return Array.from({ length: count }, (_, index) => ({
        id: `note-${index}`,
        pitch: 60,
        startTick: index * 120,
        durationTicks: 120,
        velocity: 80,
        selected: false,
    }));
}

function stepFrame() {
    const pending = [...frames.values()];
    frames.clear();
    act(() => pending.forEach((callback) => callback(nextFrame * 16)));
}

function ids(visible: readonly Note[]) {
    return visible.map((note) => note.id);
}

test('large windows mount in bounded frame batches and finish in candidate order', () => {
    const candidates = notes(125);
    const { result } = renderHook(() =>
        useVelocityMountQueue(candidates, true, null),
    );
    expect(result.current.visible.length).toBeLessThanOrEqual(40);
    expect(result.current.busy).toBe(true);
    for (let frame = 0; frame < 6 && result.current.busy; frame++) {
        const previous = new Set(ids(result.current.visible));
        expect(frames.size).toBeGreaterThan(0);
        stepFrame();
        const added = result.current.visible.filter(
            (note) => !previous.has(note.id),
        );
        expect(added.length).toBeGreaterThan(0);
        expect(added.length).toBeLessThanOrEqual(40);
    }
    expect(ids(result.current.visible)).toEqual(ids(candidates));
    expect(result.current.busy).toBe(false);
    expect(frames.size).toBe(0);
});

test('a late priority note enters the next batch without reordering candidates', () => {
    const candidates = notes(125);
    const { result, rerender } = renderHook(
        ({ priorityId }) => useVelocityMountQueue(candidates, true, priorityId),
        { initialProps: { priorityId: null as string | null } },
    );
    rerender({ priorityId: 'note-124' });
    stepFrame();
    expect(ids(result.current.visible)).toContain('note-124');
    const positions = result.current.visible.map((note) =>
        candidates.indexOf(note),
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
});

test('panning retains mounted notes in the new window and drops stale queued notes', () => {
    const original = notes(160);
    const { result, rerender } = renderHook(
        ({ candidates }) => useVelocityMountQueue(candidates, true, null),
        { initialProps: { candidates: original.slice(0, 120) } },
    );
    stepFrame();
    const mounted = result.current.visible.filter(
        (note) => note.startTick >= 20 * 120,
    );
    const pendingIds = [...frames.keys()];
    const next = original.slice(20, 160);
    rerender({ candidates: next });
    for (const note of mounted) {
        expect(result.current.visible).toContain(note);
    }
    expect(result.current.visible.every((note) => next.includes(note))).toBe(
        true,
    );
    for (const id of pendingIds) expect(cancelFrame).toHaveBeenCalledWith(id);
    for (let frame = 0; frame < 6 && result.current.busy; frame++) stepFrame();
    expect(ids(result.current.visible)).toEqual(ids(next));
    expect(result.current.busy).toBe(false);
    expect(frames.size).toBe(0);
});

test('existing IDs immediately expose new note objects without restarting admission', () => {
    const original = notes(125);
    const { result, rerender } = renderHook(
        ({ candidates }) => useVelocityMountQueue(candidates, true, null),
        { initialProps: { candidates: original } },
    );
    stepFrame();
    const before = ids(result.current.visible);
    const updated = original.map((note) => ({ ...note, velocity: 50 }));
    rerender({ candidates: updated });
    expect(ids(result.current.visible)).toEqual(before);
    for (const note of result.current.visible) {
        expect(note).toBe(
            updated.find((candidate) => candidate.id === note.id),
        );
        expect(note.velocity).toBe(50);
    }
    for (let frame = 0; frame < 6 && result.current.busy; frame++) stepFrame();
    expect(result.current.visible).toEqual(updated);
});

test('closing cancels queued work immediately and reopening never restores the full old window', () => {
    const candidates = notes(125);
    const { result, rerender } = renderHook(
        ({ enabled }) => useVelocityMountQueue(candidates, enabled, null),
        { initialProps: { enabled: true } },
    );
    for (let frame = 0; frame < 6 && result.current.busy; frame++) stepFrame();
    expect(result.current.visible).toHaveLength(125);
    rerender({ enabled: false });
    expect(result.current).toEqual({ visible: [], busy: false });
    expect(frames.size).toBe(0);
    rerender({ enabled: true });
    expect(result.current.visible.length).toBeLessThanOrEqual(40);
    expect(result.current.busy).toBe(true);
    const pendingIds = [...frames.keys()];
    rerender({ enabled: false });
    expect(result.current).toEqual({ visible: [], busy: false });
    for (const id of pendingIds) expect(cancelFrame).toHaveBeenCalledWith(id);
    stepFrame();
    expect(result.current).toEqual({ visible: [], busy: false });
});

test('unmount cancels the outstanding frame and empty windows queue no work', () => {
    const candidates = notes(125);
    const { unmount } = renderHook(() =>
        useVelocityMountQueue(candidates, true, null),
    );
    const pendingIds = [...frames.keys()];
    expect(pendingIds.length).toBeGreaterThan(0);
    unmount();
    for (const id of pendingIds) expect(cancelFrame).toHaveBeenCalledWith(id);
    expect(frames.size).toBe(0);
    const { result } = renderHook(() => useVelocityMountQueue([], true, null));
    expect(result.current).toEqual({ visible: [], busy: false });
    expect(frames.size).toBe(0);
});

test('changing priority each frame cannot restart the queue or starve ordinary notes', () => {
    const candidates = notes(160);
    const { result, rerender } = renderHook(
        ({ priorityId }) => useVelocityMountQueue(candidates, true, priorityId),
        { initialProps: { priorityId: null as string | null } },
    );
    for (let frame = 0; frame < 6 && result.current.busy; frame++) {
        const previous = new Set(ids(result.current.visible));
        rerender({ priorityId: `note-${159 - frame}` });
        stepFrame();
        expect(
            result.current.visible.filter((note) => !previous.has(note.id))
                .length,
        ).toBeLessThanOrEqual(40);
        for (const id of previous)
            expect(ids(result.current.visible)).toContain(id);
    }
    expect(ids(result.current.visible)).toEqual(ids(candidates));
    expect(result.current.busy).toBe(false);
});

test('StrictMode effect replay leaves only one live batch and cancels it on unmount', () => {
    const candidates = notes(125);
    const { result, unmount } = renderHook(
        () => useVelocityMountQueue(candidates, true, null),
        { wrapper: ({ children }) => <StrictMode>{children}</StrictMode> },
    );
    expect(frames.size).toBe(1);
    const previous = new Set(ids(result.current.visible));
    stepFrame();
    const added = result.current.visible.filter(
        (note) => !previous.has(note.id),
    );
    expect(added.length).toBeGreaterThan(0);
    expect(added.length).toBeLessThanOrEqual(40);
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
});

test.each(['empty', 'disjoint'] as const)(
    'reentering an admitted window after a committed %s window starts a fresh bounded queue',
    (window) => {
        const all = notes(250);
        const original = all.slice(0, 125);
        const { result, rerender } = renderHook(
            ({ candidates }) => useVelocityMountQueue(candidates, true, null),
            { initialProps: { candidates: original } },
        );
        for (let frame = 0; frame < 6 && result.current.busy; frame++)
            stepFrame();
        expect(result.current.visible).toHaveLength(125);
        rerender({ candidates: window === 'empty' ? [] : all.slice(125) });
        expect(result.current.visible).toHaveLength(0);
        rerender({ candidates: original });
        expect(result.current.visible.length).toBeLessThanOrEqual(40);
        expect(result.current.busy).toBe(true);
        for (let frame = 0; frame < 6 && result.current.busy; frame++)
            stepFrame();
        expect(ids(result.current.visible)).toEqual(ids(original));
    },
);

test('equivalent candidate arrays can be recreated during admission without restarting renders', () => {
    const candidates = notes(125);
    const { result } = renderHook(() =>
        useVelocityMountQueue([...candidates], true, null),
    );
    for (let frame = 0; frame < 6 && result.current.busy; frame++) stepFrame();
    expect(result.current.visible).toEqual(candidates);
    expect(result.current.busy).toBe(false);
    expect(frames.size).toBe(0);
});

test('pausing cancels admission while retaining mounted notes without loading work', () => {
    const candidates = notes(125);
    const { result, rerender } = renderHook(
        ({ paused, priorityId }) =>
            useVelocityMountQueue(candidates, true, priorityId, paused),
        {
            initialProps: {
                paused: false,
                priorityId: null as string | null,
            },
        },
    );
    stepFrame();
    const admitted = ids(result.current.visible);
    const pendingIds = [...frames.keys()];
    expect(admitted.length).toBeGreaterThan(0);
    expect(pendingIds.length).toBeGreaterThan(0);
    rerender({ paused: true, priorityId: null });
    expect(ids(result.current.visible)).toEqual(admitted);
    expect(result.current.busy).toBe(false);
    for (const id of pendingIds) expect(cancelFrame).toHaveBeenCalledWith(id);
    expect(frames.size).toBe(0);
    rerender({ paused: true, priorityId: 'note-124' });
    stepFrame();
    stepFrame();
    expect(ids(result.current.visible)).toEqual(admitted);
    expect(result.current.busy).toBe(false);
    expect(frames.size).toBe(0);
});

test('resuming retains mounted notes and admits the latest priority in bounded batches', () => {
    const candidates = notes(125);
    const { result, rerender } = renderHook(
        ({ paused, priorityId }) =>
            useVelocityMountQueue(candidates, true, priorityId, paused),
        {
            initialProps: {
                paused: false,
                priorityId: null as string | null,
            },
        },
    );
    stepFrame();
    rerender({ paused: true, priorityId: 'note-124' });
    const admitted = ids(result.current.visible);
    stepFrame();
    expect(ids(result.current.visible)).toEqual(admitted);
    rerender({ paused: false, priorityId: 'note-124' });
    expect(ids(result.current.visible)).toEqual(admitted);
    expect(result.current.busy).toBe(true);
    stepFrame();
    const added = result.current.visible.filter(
        (note) => !admitted.includes(note.id),
    );
    expect(added.length).toBeGreaterThan(0);
    expect(added.length).toBeLessThanOrEqual(40);
    expect(ids(added)).toContain('note-124');
    for (const id of admitted)
        expect(ids(result.current.visible)).toContain(id);
    for (let frame = 0; frame < 6 && result.current.busy; frame++) stepFrame();
    expect(ids(result.current.visible)).toEqual(ids(candidates));
    expect(result.current.busy).toBe(false);
    expect(frames.size).toBe(0);
});

test('disabling a paused queue clears admission and reopening paused starts empty', () => {
    const candidates = notes(125);
    const { result, rerender } = renderHook(
        ({ enabled, paused }) =>
            useVelocityMountQueue(candidates, enabled, null, paused),
        { initialProps: { enabled: true, paused: false } },
    );
    stepFrame();
    expect(result.current.visible.length).toBeGreaterThan(0);
    rerender({ enabled: true, paused: true });
    rerender({ enabled: false, paused: true });
    expect(result.current).toEqual({ visible: [], busy: false });
    expect(frames.size).toBe(0);
    rerender({ enabled: true, paused: true });
    expect(result.current).toEqual({ visible: [], busy: false });
    expect(frames.size).toBe(0);
    stepFrame();
    expect(result.current).toEqual({ visible: [], busy: false });
    rerender({ enabled: true, paused: false });
    expect(result.current.busy).toBe(true);
    stepFrame();
    expect(result.current.visible.length).toBeGreaterThan(0);
    expect(result.current.visible.length).toBeLessThanOrEqual(40);
});
