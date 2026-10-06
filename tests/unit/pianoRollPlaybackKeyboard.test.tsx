// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
    cleanup,
    createEvent,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Tone from 'tone';
import { toast } from 'sonner';
import { PianoRollEditor } from '@/features/piano-roll/components/editor/PianoRollEditor';
import { PlaybackControls } from '@/features/piano-roll/components/playback/PlaybackControls';
import { usePlaybackControls } from '@/features/piano-roll/hooks/playback/usePlaybackControls';
import { useNoteKeyboard } from '@/features/piano-roll/hooks/notes/useNoteKeyboard';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { GestureMode } from '@/features/piano-roll/types';

vi.mock('tone', () => ({ start: vi.fn() }));
vi.mock('sonner', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

function Harness(props: Parameters<typeof usePlaybackControls>[0]) {
    const handlePlay = usePlaybackControls(props);
    return (
        <PianoRollEditor
            onTogglePlayback={handlePlay}
            playbackControls={
                <PlaybackControls onPlay={handlePlay} isPlaying={false} />
            }
        />
    );
}

function editor() {
    return screen.getByRole('group', { name: 'Piano roll editor' });
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(Tone.start).mockResolvedValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => null,
    );
    useNoteStore.setState({
        notes: {
            a: {
                id: 'a',
                pitch: 72,
                startTick: 120,
                durationTicks: 120,
                velocity: 100,
                selected: true,
            },
        },
    });
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

test.each(['editor', 'overlay', 'list'])(
    'Space from the %s uses the shared action once without changing notes or focus',
    async (targetKind) => {
        const user = userEvent.setup();
        const onPlay = vi.fn();
        render(<Harness samplesReady onPlay={onPlay} />);
        const target =
            targetKind === 'editor'
                ? editor()
                : targetKind === 'overlay'
                  ? screen.getByRole('group', { name: /Selected note:/ })
                  : screen.getByRole('button', { name: /Pitch 72, tick 120,/ });
        target.focus();
        const before = useNoteStore.getState();
        await user.keyboard(' ');
        await waitFor(() => expect(onPlay).toHaveBeenCalledTimes(1));
        expect(Tone.start).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(target);
        expect(useNoteStore.getState()).toBe(before);
    },
);

test('Space reports loading and uses audio activation only after samples become ready', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    const { rerender } = render(
        <Harness samplesReady={false} onPlay={onPlay} />,
    );
    editor().focus();
    await user.keyboard(' ');
    expect(toast.info).toHaveBeenCalledWith(
        'Loading piano samples…',
        expect.any(Object),
    );
    expect(Tone.start).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
    rerender(<Harness samplesReady onPlay={onPlay} />);
    expect(toast.success).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    await waitFor(() => expect(onPlay).toHaveBeenCalledTimes(1));
});

test('Space on the playback button uses its native activation once', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    render(<Harness samplesReady onPlay={onPlay} />);
    screen.getByRole('button', { name: 'Play' }).focus();
    await user.keyboard(' ');
    await waitFor(() => expect(onPlay).toHaveBeenCalledTimes(1));
    expect(Tone.start).toHaveBeenCalledTimes(1);
});

test('Space on input fields stays native and does not toggle playback', () => {
    const onPlay = vi.fn();
    render(<Harness samplesReady onPlay={onPlay} />);
    const target = document.createElement('input');
    editor().append(target);
    const event = createEvent.keyDown(target, { key: ' ' });
    fireEvent(target, event);
    expect(event.defaultPrevented).toBe(false);
    expect(Tone.start).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
    target.remove();
});

test('repeated, modified and already handled Space events are ignored', () => {
    const onPlay = vi.fn();
    render(<Harness samplesReady onPlay={onPlay} />);
    for (const modifiers of [
        { repeat: true },
        { ctrlKey: true },
        { metaKey: true },
        { altKey: true },
        { shiftKey: true },
    ]) {
        fireEvent.keyDown(editor(), { key: ' ', ...modifiers });
    }
    const event = createEvent.keyDown(editor(), { key: ' ' });
    event.preventDefault();
    fireEvent(editor(), event);
    expect(Tone.start).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
});

test('repeated bare Space is consumed to suppress native button activation and scrolling', () => {
    const onPlay = vi.fn();
    render(<Harness samplesReady onPlay={onPlay} />);
    for (const target of [
        editor(),
        screen.getByRole('button', { name: /Pitch 72, tick 120,/ }),
    ]) {
        const event = createEvent.keyDown(target, { key: ' ', repeat: true });
        fireEvent(target, event);
        expect(event.defaultPrevented).toBe(true);
    }
    expect(Tone.start).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
});

test.each<GestureMode>(['move', 'resize', 'pan', 'marquee', 'select'])(
    'Space cannot toggle playback during a %s gesture',
    (mode) => {
        const onTogglePlayback = vi.fn();
        function KeyboardHarness() {
            const onKeyDown = useNoteKeyboard({
                endTick: 15360,
                gestureModeRef: { current: mode },
                commitMove: vi.fn(),
                commitResize: vi.fn(),
                deleteNotes: vi.fn(),
                copyNotes: vi.fn(),
                pasteNotes: vi.fn(),
                onTogglePlayback,
            });
            return (
                <div
                    role="group"
                    aria-label="Keyboard harness"
                    onKeyDown={onKeyDown}
                />
            );
        }
        render(<KeyboardHarness />);
        fireEvent.keyDown(
            screen.getByRole('group', { name: 'Keyboard harness' }),
            { key: ' ' },
        );
        expect(onTogglePlayback).not.toHaveBeenCalled();
    },
);
