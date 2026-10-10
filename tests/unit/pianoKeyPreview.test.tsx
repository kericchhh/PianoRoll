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
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as Tone from 'tone';
import { toast } from 'sonner';
import { usePianoPreview } from '@/features/piano-roll/hooks/playback/usePianoPreview';
import { PianoKeys } from '@/features/piano-roll/components/grid/PianoKeys';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';

vi.mock('tone', () => ({
    start: vi.fn(),
    now: vi.fn(() => 12),
    Midi: vi.fn((pitch: number) => ({ toNote: () => `pitch-${pitch}` })),
}));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Tone.start).mockResolvedValue(undefined);
});
afterEach(cleanup);

function setupPreview(samplesReady = true, samplesFailed = false) {
    const sampler = {
        loaded: true,
        disposed: false,
        triggerAttackRelease: vi.fn(),
    };
    const getPreviewSampler = vi.fn(() => sampler as unknown as Tone.Sampler);
    const hook = renderHook(() =>
        usePianoPreview({ samplesReady, samplesFailed, getPreviewSampler }),
    );
    return { ...hook, sampler, getPreviewSampler };
}

test('each audition enables audio and plays a short preview without changing notes, selection, or history', async () => {
    const { result, sampler } = setupPreview();
    const before = useNoteStore.getState();
    await act(() => result.current(72));
    expect(Tone.start).toHaveBeenCalledTimes(1);
    expect(sampler.triggerAttackRelease).toHaveBeenCalledWith(
        'pitch-72',
        0.3,
        12,
        100 / 127,
    );
    expect(useNoteStore.getState()).toBe(before);
});

test.each([
    {
        ready: false,
        failed: false,
        method: 'info' as const,
        message: 'Loading piano samples…',
    },
    {
        ready: false,
        failed: true,
        method: 'error' as const,
        message: 'Could not load piano samples. Reload to try again.',
    },
])(
    'sample availability is announced before enabling audio: $message',
    async ({ ready, failed, method, message }) => {
        const { result, getPreviewSampler } = setupPreview(ready, failed);
        await result.current(72);
        expect(toast[method]).toHaveBeenCalledWith(message, {
            id: 'piano-samples',
        });
        expect(Tone.start).not.toHaveBeenCalled();
        expect(getPreviewSampler).not.toHaveBeenCalled();
    },
);

test('audio activation failure is announced and the next press can retry', async () => {
    const { result, sampler } = setupPreview();
    vi.mocked(Tone.start).mockRejectedValueOnce(new Error('Blocked'));
    await result.current(72);
    expect(sampler.triggerAttackRelease).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
        'Could not preview piano. Press a key to try again.',
        { id: 'piano-audio' },
    );
    await result.current(72);
    expect(sampler.triggerAttackRelease).toHaveBeenCalledTimes(1);
});

test('a delayed audio activation cannot use a disposed preview sampler', async () => {
    const { result, sampler } = setupPreview();
    let resolve!: () => void;
    vi.mocked(Tone.start).mockReturnValueOnce(
        new Promise<void>((done) => {
            resolve = done;
        }),
    );
    const pending = result.current(72);
    sampler.disposed = true;
    resolve();
    await pending;
    expect(sampler.triggerAttackRelease).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
});

test('keyboard keys preview once per press, expose pressed feedback, and use one roving Tab stop', async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    render(
        <>
            <PianoKeys highestPitch={72} height={60} onPreview={onPreview} />
            <button>After keys</button>
        </>,
    );
    const c = screen.getByRole('button', { name: 'Preview C5, MIDI pitch 72' });
    await user.tab();
    expect(document.activeElement).toBe(c);
    fireEvent.keyDown(c, { key: ' ', repeat: false });
    fireEvent.keyDown(c, { key: ' ', repeat: true });
    expect(onPreview).toHaveBeenCalledExactlyOnceWith(72);
    expect(c.dataset.pressed).toBe('true');
    fireEvent.keyUp(c, { key: ' ' });
    expect(c.dataset.pressed).toBe('false');
    await user.keyboard('{ArrowDown}');
    const b = screen.getByRole('button', { name: 'Preview B4, MIDI pitch 71' });
    expect(document.activeElement).toBe(b);
    expect(onPreview).toHaveBeenCalledTimes(1);
    await user.keyboard('{Enter}');
    expect(onPreview).toHaveBeenLastCalledWith(71);
    expect(onPreview).toHaveBeenCalledTimes(2);
    await user.tab();
    expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'After keys' }),
    );
});

test('assistive activation previews and losing focus clears a held key', async () => {
    const onPreview = vi.fn();
    render(<PianoKeys highestPitch={72} height={60} onPreview={onPreview} />);
    const c = screen.getByRole('button', { name: 'Preview C5, MIDI pitch 72' });
    fireEvent.click(c, { detail: 0 });
    expect(onPreview).toHaveBeenCalledExactlyOnceWith(72);
    fireEvent.keyDown(c, { key: 'Enter' });
    expect(c.dataset.pressed).toBe('true');
    fireEvent.blur(c);
    await waitFor(() => expect(c.dataset.pressed).toBe('false'));
});
