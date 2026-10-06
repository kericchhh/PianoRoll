// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Tone from 'tone';
import { toast } from 'sonner';
import { PlaybackControls } from '@/features/piano-roll/components/PlaybackControls';
import { usePlaybackControls } from '@/features/piano-roll/hooks/usePlaybackControls';

function ControlsHarness(
    props: Parameters<typeof usePlaybackControls>[0] & { isPlaying: boolean },
) {
    const handlePlay = usePlaybackControls(props);
    return <PlaybackControls onPlay={handlePlay} isPlaying={props.isPlaying} />;
}

vi.mock('tone', () => ({ start: vi.fn() }));
vi.mock('sonner', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(Tone.start).mockResolvedValue(undefined);
});
afterEach(cleanup);

test('Play remains keyboard operable before readiness and gives feedback without enabling audio', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    render(
        <ControlsHarness
            isPlaying={false}
            samplesReady={false}
            onPlay={onPlay}
        />,
    );
    expect(toast.info).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();

    await user.tab();
    await user.keyboard('{Enter}');

    expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Play' }),
    );
    expect(toast.info).toHaveBeenCalledWith(
        'Loading piano samples…',
        expect.any(Object),
    );
    expect(Tone.start).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
});

test('a readiness transition notifies once and only a subsequent Play action enables audio', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    const { rerender } = render(
        <ControlsHarness
            isPlaying={false}
            samplesReady={false}
            onPlay={onPlay}
        />,
    );
    await user.click(screen.getByRole('button', { name: 'Play' }));
    rerender(
        <ControlsHarness isPlaying={false} samplesReady onPlay={onPlay} />,
    );
    rerender(
        <ControlsHarness isPlaying={false} samplesReady onPlay={onPlay} />,
    );

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
        'Piano ready',
        expect.any(Object),
    );
    expect(Tone.start).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(Tone.start).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledTimes(1);
});

test('failed audio activation gives retry feedback and handles the rejected promise', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    vi.mocked(Tone.start).mockRejectedValue(new Error('Audio unavailable'));
    render(<ControlsHarness isPlaying={false} samplesReady onPlay={onPlay} />);
    await user.click(screen.getByRole('button', { name: 'Play' }));

    await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
            'Could not enable audio. Press Play to try again.',
            expect.any(Object),
        ),
    );
    expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Play' }),
    );
    expect(onPlay).not.toHaveBeenCalled();
});

test('a sample loading failure is announced and Play remains focusable with accurate feedback', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    const { rerender } = render(
        <ControlsHarness
            isPlaying={false}
            samplesReady={false}
            onPlay={onPlay}
        />,
    );
    rerender(
        <ControlsHarness
            isPlaying={false}
            samplesReady={false}
            samplesFailed
            onPlay={onPlay}
        />,
    );
    expect(toast.error).toHaveBeenCalledWith(
        'Could not load piano samples. Reload to try again.',
        expect.any(Object),
    );
    await user.tab();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Play' }),
    );
    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(toast.info).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(Tone.start).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
});

test('waits for audio activation to resolve before invoking playback', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    let enableAudio!: () => void;
    vi.mocked(Tone.start).mockReturnValue(
        new Promise<void>((resolve) => {
            enableAudio = resolve;
        }),
    );
    render(<ControlsHarness isPlaying={false} samplesReady onPlay={onPlay} />);
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(Tone.start).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();

    enableAudio();
    await waitFor(() => expect(onPlay).toHaveBeenCalledTimes(1));
});
