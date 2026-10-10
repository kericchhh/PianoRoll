import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Tone from 'tone';
import { toast } from 'sonner';
import { MidiExportButton } from '@/features/piano-roll/components/midi/MidiExportButton';
import { useMidiExport } from '@/features/piano-roll/hooks/midi/useMidiExport';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { serializeMidi } from '@/features/piano-roll/midi/serializeMidi';
import { downloadMidi } from '@/features/piano-roll/midi/downloadMidi';
import type { Note } from '@/features/piano-roll/types';

vi.mock('tone', () => ({
    getTransport: vi.fn(() => ({ bpm: { value: 93 } })),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/features/piano-roll/midi/serializeMidi', () => ({
    serializeMidi: vi.fn(),
}));
vi.mock('@/features/piano-roll/midi/downloadMidi', () => ({
    downloadMidi: vi.fn(),
}));

const note: Note = {
    id: 'a',
    pitch: 72,
    startTick: 120,
    durationTicks: 240,
    velocity: 100,
    selected: true,
};
const bytes = new Uint8Array([1, 2, 3]);

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(serializeMidi)
        .mockReset()
        .mockReturnValue({ bytes, noteCount: 1, omittedNoteCount: 0 });
    vi.mocked(downloadMidi).mockReset();
    useNoteStore.setState(useNoteStore.getInitialState());
    useNoteStore.getState().addNote(note);
    useNoteStore.getState().moveNote('a', 240, 70);
    useNoteStore.getState().undo();
});

afterEach(cleanup);

test('keyboard export uses the current notes and playback tempo without editing notes or history', async () => {
    const user = userEvent.setup();
    render(<MidiExportButton />);
    const before = useNoteStore.getState();
    expect(serializeMidi).not.toHaveBeenCalled();
    expect(Tone.getTransport).not.toHaveBeenCalled();
    await user.tab();
    const button = screen.getByRole('button', { name: 'Export MIDI' });
    expect(document.activeElement).toBe(button);
    await user.keyboard('{Enter}');
    await waitFor(() =>
        expect(downloadMidi).toHaveBeenCalledExactlyOnceWith(bytes),
    );
    expect(serializeMidi).toHaveBeenCalledExactlyOnceWith([note], 93);
    expect(toast.success).toHaveBeenCalledWith('MIDI download started', {
        id: 'midi-export',
        description: '1 note exported.',
    });
    expect(useNoteStore.getState()).toBe(before);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-busy')).toBe('false');
});

test('repeated activation while loading creates one download and stays focusable', async () => {
    render(<MidiExportButton />);
    const button = screen.getByRole('button', { name: 'Export MIDI' });
    button.focus();
    fireEvent.click(button);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('false'));
    expect(serializeMidi).toHaveBeenCalledTimes(1);
    expect(downloadMidi).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(button);
});

test('the export captures the click-time notes before the serializer finishes loading', async () => {
    const { result } = renderHook(useMidiExport);
    const before = Object.values(useNoteStore.getState().notes);
    let pending!: Promise<void>;
    act(() => {
        pending = result.current.exportMidi();
        useNoteStore
            .getState()
            .addNote({ ...note, id: 'later', startTick: 480 });
    });
    await act(async () => {
        await pending;
    });
    expect(serializeMidi).toHaveBeenCalledWith(before, 93);
    expect(Object.keys(useNoteStore.getState().notes)).toHaveLength(2);
});

test('omitted silent notes are explained in the export notification', async () => {
    vi.mocked(serializeMidi).mockReturnValue({
        bytes,
        noteCount: 2,
        omittedNoteCount: 1,
    });
    render(<MidiExportButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Export MIDI' }));
    await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('MIDI download started', {
            id: 'midi-export',
            description: '2 notes exported. 1 silent note omitted.',
        }),
    );
});

test.each(['serialization', 'download'])(
    'a %s failure is announced and a subsequent export can retry',
    async (failure) => {
        if (failure === 'serialization')
            vi.mocked(serializeMidi).mockImplementationOnce(() => {
                throw new Error('Invalid note');
            });
        else
            vi.mocked(downloadMidi).mockImplementationOnce(() => {
                throw new Error('Download failed');
            });
        const { result } = renderHook(useMidiExport);
        const before = useNoteStore.getState();
        await act(async () => {
            await result.current.exportMidi();
        });
        expect(result.current.isExporting).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(
            'Could not export MIDI. Try again.',
            { id: 'midi-export' },
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(useNoteStore.getState()).toBe(before);
        await act(async () => {
            await result.current.exportMidi();
        });
        expect(toast.success).toHaveBeenCalledTimes(1);
    },
);

test('unmounting before lazy loading completes cancels the download and its notifications', async () => {
    const { result, unmount } = renderHook(useMidiExport);
    let pending!: Promise<void>;
    act(() => {
        pending = result.current.exportMidi();
    });
    unmount();
    await pending;
    expect(downloadMidi).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
});
