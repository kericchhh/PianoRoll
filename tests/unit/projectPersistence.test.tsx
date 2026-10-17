import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useProjectPersistence } from '@/features/piano-roll/hooks/projects/useProjectPersistence';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import {
    loadProject,
    saveProject,
} from '@/features/piano-roll/persistence/projectRepository';
import type { ProjectRecord } from '@/features/piano-roll/persistence/projectRecord';
import type { Note } from '@/features/piano-roll/types';

vi.mock('@/features/piano-roll/persistence/projectRepository', () => ({
    saveProject: vi.fn(),
    loadProject: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const before: Note = {
    id: 'before',
    pitch: 60,
    startTick: 120,
    durationTicks: 240,
    velocity: 100,
    selected: true,
};
const saved: ProjectRecord = {
    id: 'local',
    version: 2,
    bpm: 120,
    ppq: 480,
    beatsPerBar: 4,
    barCount: 16,
    savedAt: 1000,
    notes: [
        {
            id: 'saved-id',
            pitch: 127,
            startTick: 80001,
            durationTicks: 1,
            velocity: 0,
        },
    ],
};
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((finish) => {
        resolve = finish;
    });
    return { promise, resolve };
}
beforeEach(() => {
    vi.resetAllMocks();
    useNoteStore.setState(useNoteStore.getInitialState());
    useNoteStore.getState().addNote(before);
    useNoteStore.getState().addNote({ ...before, id: 'undone' });
    useNoteStore.getState().undo();
    vi.mocked(saveProject).mockResolvedValue(undefined);
    vi.mocked(loadProject).mockResolvedValue(saved);
});
afterEach(cleanup);

test('saving snapshots the composition without selection and leaves edit history untouched', async () => {
    const original = useNoteStore.getState();
    const announce = vi.fn();
    const { result } = renderHook(() =>
        useProjectPersistence({ bpm: 120, barCount: 8, announce }),
    );
    await act(() => result.current.save());
    expect(saveProject).toHaveBeenCalledOnce();
    expect(saveProject).toHaveBeenCalledWith({
        ...saved,
        barCount: 8,
        savedAt: expect.any(Number),
        notes: [
            {
                id: before.id,
                pitch: before.pitch,
                startTick: before.startTick,
                durationTicks: before.durationTicks,
                velocity: before.velocity,
            },
        ],
    });
    expect(useNoteStore.getState()).toBe(original);
    expect(result.current.error).toBeNull();
    expect(result.current.isBusy).toBe(false);
    expect(announce).toHaveBeenCalled();
});

test('loading validates before stopping playback and restores exact IDs/data with cleared history', async () => {
    const original = useNoteStore.getState();
    const onBeforeLoad = vi.fn(() =>
        expect(useNoteStore.getState()).toBe(original),
    );
    const onLoaded = vi.fn();
    const announce = vi.fn();
    const { result } = renderHook(() =>
        useProjectPersistence({
            bpm: 120,
            barCount: 4,
            onBeforeLoad,
            onLoaded,
            announce,
        }),
    );
    await act(() => result.current.load());
    expect(onBeforeLoad).toHaveBeenCalledExactlyOnceWith(saved);
    expect(onLoaded).toHaveBeenCalledWith(saved);
    expect(useNoteStore.getState().notes).toEqual({
        'saved-id': { ...saved.notes[0], selected: false },
    });
    expect(useNoteStore.getState().undoStack).toEqual([]);
    expect(useNoteStore.getState().redoStack).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(announce).toHaveBeenCalled();
});

test.each(['missing', 'invalid', 'sparse', 'read-error'])(
    '%s saved projects preserve notes, selection, history, playback and timeline',
    async (failure) => {
        if (failure === 'missing')
            vi.mocked(loadProject).mockResolvedValue(null);
        if (failure === 'invalid') {
            vi.mocked(loadProject).mockResolvedValue({
                ...saved,
                version: 3,
            } as unknown as ProjectRecord);
        }
        if (failure === 'sparse') {
            vi.mocked(loadProject).mockResolvedValue({
                ...saved,
                notes: new Array(1),
            });
        }
        if (failure === 'read-error') {
            vi.mocked(loadProject).mockRejectedValue(
                new Error('Storage denied'),
            );
        }
        const original = useNoteStore.getState();
        const onBeforeLoad = vi.fn();
        const onLoaded = vi.fn();
        const { result } = renderHook(() =>
            useProjectPersistence({
                bpm: 120,
                barCount: 4,
                onBeforeLoad,
                onLoaded,
            }),
        );
        await act(() => result.current.load());
        expect(useNoteStore.getState()).toBe(original);
        expect(onBeforeLoad).not.toHaveBeenCalled();
        expect(onLoaded).not.toHaveBeenCalled();
        expect(result.current.isBusy).toBe(false);
        if (failure !== 'missing')
            expect(result.current.error).toEqual(expect.any(String));
    },
);

test('a failed save reports the error and releases the lock for retry', async () => {
    const original = useNoteStore.getState();
    vi.mocked(saveProject).mockRejectedValueOnce(new Error('Quota exceeded'));
    const { result } = renderHook(() =>
        useProjectPersistence({ bpm: 120, barCount: 4 }),
    );
    await act(() => result.current.save());
    expect(result.current.error).toEqual(expect.any(String));
    expect(result.current.isBusy).toBe(false);
    expect(useNoteStore.getState()).toBe(original);
    await act(() => result.current.save());
    expect(saveProject).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
});

test('duplicate load and save actions share an immediate lock', async () => {
    const pending = deferred<ProjectRecord>();
    vi.mocked(loadProject).mockReturnValue(pending.promise);
    const { result } = renderHook(() =>
        useProjectPersistence({ bpm: 120, barCount: 4 }),
    );
    let action!: Promise<void>;
    await act(async () => {
        action = result.current.load();
    });
    expect(result.current.isBusy).toBe(true);
    await act(async () => {
        await result.current.load();
        await result.current.save();
    });
    expect(loadProject).toHaveBeenCalledOnce();
    expect(saveProject).not.toHaveBeenCalled();
    await act(async () => {
        pending.resolve(saved);
        await action;
    });
    expect(result.current.isBusy).toBe(false);
});

test('late reads after unmount cannot stop playback or replace notes', async () => {
    const pending = deferred<ProjectRecord>();
    vi.mocked(loadProject).mockReturnValue(pending.promise);
    const original = useNoteStore.getState();
    const onBeforeLoad = vi.fn();
    const onLoaded = vi.fn();
    const { result, unmount } = renderHook(() =>
        useProjectPersistence({
            bpm: 120,
            barCount: 4,
            onBeforeLoad,
            onLoaded,
        }),
    );
    let action!: Promise<void>;
    await act(async () => {
        action = result.current.load();
    });
    unmount();
    await act(async () => {
        pending.resolve(saved);
        await action;
    });
    expect(useNoteStore.getState()).toBe(original);
    expect(onBeforeLoad).not.toHaveBeenCalled();
    expect(onLoaded).not.toHaveBeenCalled();
});

test('notes edited while a load is reading are not overwritten', async () => {
    const pending = deferred<ProjectRecord>();
    vi.mocked(loadProject).mockReturnValue(pending.promise);
    const onBeforeLoad = vi.fn();
    const { result } = renderHook(() =>
        useProjectPersistence({ bpm: 120, barCount: 4, onBeforeLoad }),
    );
    let action!: Promise<void>;
    await act(async () => {
        action = result.current.load();
    });
    useNoteStore.getState().moveNote(before.id, 480, 62);
    const edited = useNoteStore.getState();
    await act(async () => {
        pending.resolve(saved);
        await action;
    });
    expect(useNoteStore.getState()).toBe(edited);
    expect(onBeforeLoad).not.toHaveBeenCalled();
});

test('load rechecks active gesture ownership after its asynchronous read', async () => {
    const pending = deferred<ProjectRecord>();
    vi.mocked(loadProject).mockReturnValue(pending.promise);
    const canLoad = vi.fn().mockReturnValue(true);
    const onBeforeLoad = vi.fn();
    const original = useNoteStore.getState();
    const { result } = renderHook(() =>
        useProjectPersistence({ bpm: 120, barCount: 4, canLoad, onBeforeLoad }),
    );
    let action!: Promise<void>;
    await act(async () => {
        action = result.current.load();
    });
    canLoad.mockReturnValue(false);
    await act(async () => {
        pending.resolve(saved);
        await action;
    });
    expect(useNoteStore.getState()).toBe(original);
    expect(onBeforeLoad).not.toHaveBeenCalled();
});

test('an empty saved project is loadable and clears the previous composition', async () => {
    vi.mocked(loadProject).mockResolvedValue({ ...saved, notes: [] });
    const { result } = renderHook(() =>
        useProjectPersistence({ bpm: 120, barCount: 4 }),
    );
    await act(() => result.current.load());
    expect(useNoteStore.getState().notes).toEqual({});
    expect(useNoteStore.getState().undoStack).toEqual([]);
    expect(useNoteStore.getState().redoStack).toEqual([]);
});

test('a timeline length changed during a pending read cannot be overwritten', async () => {
    const pending = deferred<ProjectRecord>();
    vi.mocked(loadProject).mockReturnValue(pending.promise);
    const onBeforeLoad = vi.fn();
    const onLoaded = vi.fn();
    const original = useNoteStore.getState();
    const { result, rerender } = renderHook(
        ({ barCount }) =>
            useProjectPersistence({
                bpm: 120,
                barCount,
                onBeforeLoad,
                onLoaded,
            }),
        { initialProps: { barCount: 4 } },
    );
    let action!: Promise<void>;
    await act(async () => {
        action = result.current.load();
    });
    rerender({ barCount: 8 });
    await act(async () => {
        pending.resolve(saved);
        await action;
    });
    expect(useNoteStore.getState()).toBe(original);
    expect(onBeforeLoad).not.toHaveBeenCalled();
    expect(onLoaded).not.toHaveBeenCalled();
    expect(result.current.error).toEqual(expect.any(String));
});

test('save captures the invocation data while later edits remain in the editor', async () => {
    const pending = deferred<void>();
    vi.mocked(saveProject).mockReturnValue(pending.promise);
    const onBeforeLoad = vi.fn();
    const { result } = renderHook(() =>
        useProjectPersistence({ bpm: 120, barCount: 8, onBeforeLoad }),
    );
    let action!: Promise<void>;
    await act(async () => {
        action = result.current.save();
    });
    useNoteStore.getState().moveNote(before.id, 960, 72);
    const edited = useNoteStore.getState();
    await act(async () => {
        await result.current.save();
        await result.current.load();
    });
    expect(saveProject).toHaveBeenCalledOnce();
    expect(loadProject).not.toHaveBeenCalled();
    expect(vi.mocked(saveProject).mock.calls[0][0].notes[0]).toMatchObject({
        startTick: before.startTick,
        pitch: before.pitch,
    });
    await act(async () => {
        pending.resolve(undefined);
        await action;
    });
    expect(useNoteStore.getState()).toBe(edited);
    expect(onBeforeLoad).not.toHaveBeenCalled();
});

test('an active gesture rejects loading before any database read', async () => {
    const canLoad = vi.fn().mockReturnValue(false);
    const onBeforeLoad = vi.fn();
    const original = useNoteStore.getState();
    const { result } = renderHook(() =>
        useProjectPersistence({ bpm: 120, barCount: 4, canLoad, onBeforeLoad }),
    );
    await act(() => result.current.load());
    expect(loadProject).not.toHaveBeenCalled();
    expect(onBeforeLoad).not.toHaveBeenCalled();
    expect(useNoteStore.getState()).toBe(original);
    expect(result.current.error).toEqual(expect.any(String));
});

test('a BPM change during a pending load leaves the current composition and playback untouched', async () => {
    const pending = deferred<ProjectRecord>();
    vi.mocked(loadProject).mockReturnValue(pending.promise);
    const onBeforeLoad = vi.fn();
    const onLoaded = vi.fn();
    const original = useNoteStore.getState();
    const { result, rerender } = renderHook(
        ({ bpm }) =>
            useProjectPersistence({ barCount: 8, bpm, onBeforeLoad, onLoaded }),
        { initialProps: { bpm: 120 } },
    );
    let action!: Promise<void>;
    await act(async () => {
        action = result.current.load();
    });
    rerender({ bpm: 177 });
    await act(async () => {
        pending.resolve(saved);
        await action;
    });
    expect(useNoteStore.getState()).toBe(original);
    expect(onBeforeLoad).not.toHaveBeenCalled();
    expect(onLoaded).not.toHaveBeenCalled();
    expect(result.current.error).toEqual(expect.any(String));
});

test.each([undefined, '120', 29, 301, 120.5, NaN])(
    'invalid persisted BPM %j cannot stop playback or replace the composition',
    async (bpm) => {
        vi.mocked(loadProject).mockResolvedValue({
            ...saved,
            bpm,
        } as unknown as ProjectRecord);
        const original = useNoteStore.getState();
        const onBeforeLoad = vi.fn();
        const onLoaded = vi.fn();
        const { result } = renderHook(() =>
            useProjectPersistence({
                barCount: 8,
                bpm: 177,
                onBeforeLoad,
                onLoaded,
            }),
        );
        await act(() => result.current.load());
        expect(useNoteStore.getState()).toBe(original);
        expect(onBeforeLoad).not.toHaveBeenCalled();
        expect(onLoaded).not.toHaveBeenCalled();
        expect(result.current.error).toEqual(expect.any(String));
    },
);

test('save captures BPM at invocation while later tempo edits remain local', async () => {
    const pending = deferred<void>();
    vi.mocked(saveProject).mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(
        ({ bpm }) => useProjectPersistence({ barCount: 8, bpm }),
        { initialProps: { bpm: 93 } },
    );
    let action!: Promise<void>;
    await act(async () => {
        action = result.current.save();
    });
    rerender({ bpm: 177 });
    expect(saveProject).toHaveBeenCalledWith(
        expect.objectContaining({ version: 2, bpm: 93 }),
    );
    await act(async () => {
        pending.resolve(undefined);
        await action;
    });
    expect(result.current.error).toBeNull();
});
