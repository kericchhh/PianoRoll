import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { Midi } from '@tonejs/midi';
import { useMidiImport } from '@/features/piano-roll/hooks/midi/useMidiImport';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { Note } from '@/features/piano-roll/types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const original: Note = {
    id: 'before',
    pitch: 60,
    startTick: 120,
    durationTicks: 240,
    velocity: 100,
    selected: true,
};
const file = (bytes: Uint8Array) =>
    ({
        size: bytes.length,
        arrayBuffer: vi.fn().mockResolvedValue(bytes.slice().buffer),
    }) as unknown as File;
function midi() {
    const source = new Midi();
    source
        .addTrack()
        .addNote({ midi: 72, ticks: 0, durationTicks: 480, velocity: 1 });
    return source.toArray();
}
beforeEach(() => {
    vi.clearAllMocks();
    useNoteStore.setState({
        notes: { before: original },
        undoStack: [],
        redoStack: [],
    });
});
afterEach(cleanup);

test('validates before stopping playback and replaces notes in one command with fresh IDs', async () => {
    const onBeforeImport = vi.fn(() =>
        expect(useNoteStore.getState().notes).toEqual({ before: original }),
    );
    const onImported = vi.fn();
    const { result } = renderHook(() =>
        useMidiImport({ onBeforeImport, onImported }),
    );
    await act(() => result.current.importMidi(file(midi())));
    const notes = Object.values(useNoteStore.getState().notes);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
        pitch: 72,
        startTick: 0,
        durationTicks: 480,
        velocity: 127,
        selected: true,
    });
    expect(notes[0].id).not.toBe('before');
    expect(onBeforeImport).toHaveBeenCalledOnce();
    expect(onImported).toHaveBeenCalledWith(notes, 480);
    expect(useNoteStore.getState().undoStack).toHaveLength(1);
    useNoteStore.getState().undo();
    expect(useNoteStore.getState().notes).toEqual({ before: original });
});

test('invalid input leaves composition, history and playback untouched and allows retrying', async () => {
    const onBeforeImport = vi.fn();
    const { result } = renderHook(() => useMidiImport({ onBeforeImport }));
    await act(() => result.current.importMidi(file(new Uint8Array([1, 2]))));
    expect(result.current.error).toMatch(/valid/);
    expect(onBeforeImport).not.toHaveBeenCalled();
    expect(useNoteStore.getState().notes).toEqual({ before: original });
    expect(useNoteStore.getState().undoStack).toEqual([]);
    await act(() => result.current.importMidi(file(midi())));
    expect(result.current.error).toBeNull();
    expect(onBeforeImport).toHaveBeenCalledOnce();
});

test('duplicate imports and late reads after unmount cannot commit', async () => {
    let finish!: (bytes: ArrayBuffer) => void;
    const input = {
        size: 100,
        arrayBuffer: vi.fn().mockReturnValue(
            new Promise<ArrayBuffer>((resolve) => {
                finish = resolve;
            }),
        ),
    } as unknown as File;
    const onBeforeImport = vi.fn();
    const { result, unmount } = renderHook(() =>
        useMidiImport({ onBeforeImport }),
    );
    let pending!: Promise<void>;
    await act(async () => {
        pending = result.current.importMidi(input);
    });
    await act(() => result.current.importMidi(input));
    expect(input.arrayBuffer).toHaveBeenCalledOnce();
    unmount();
    await act(async () => {
        finish(midi().slice().buffer);
        await pending;
    });
    expect(onBeforeImport).not.toHaveBeenCalled();
    expect(useNoteStore.getState().notes).toEqual({ before: original });
});
