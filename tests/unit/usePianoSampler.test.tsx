// @vitest-environment jsdom
import { StrictMode, type ReactNode } from 'react';
import {
    act,
    cleanup,
    render,
    renderHook,
    screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as Tone from 'tone';
import type { SamplerOptions } from 'tone';
import { toast } from 'sonner';
import { App } from '@/app/App';
import { usePianoSampler } from '@/features/piano-roll/hooks/usePianoSampler';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';

const {
    samplers,
    transport,
    context,
    scheduledEvents,
    completionTimers,
    resetEventIds,
} = vi.hoisted(() => {
    const scheduledEvents = new Map<
        number,
        { callback: (time: number) => void; position: number }
    >();
    let nextEventId = 1;
    let nextTimerId = 1;
    const completionTimers = new Map<number, () => void>();
    const context = {
        immediate: vi.fn(() => 11.9),
        setTimeout: vi.fn((callback: () => void, delay: number) => {
            if (delay < 0)
                throw new Error('Completion delay must not be negative');
            const id = nextTimerId++;
            completionTimers.set(id, callback);
            return id;
        }),
        clearTimeout: vi.fn((id: number) => completionTimers.delete(id)),
    };
    const transport = {
        state: 'stopped' as 'started' | 'paused' | 'stopped',
        seconds: 0,
        bpm: { value: 120 },
        PPQ: 192,
        getTicksAtTime: vi.fn(
            () =>
                (transport.seconds * transport.bpm.value * transport.PPQ) / 60,
        ),
        schedule: vi.fn(
            (callback: (time: number) => void, position: number) => {
                const id = nextEventId++;
                scheduledEvents.set(id, { callback, position });
                return id;
            },
        ),
        clear: vi.fn((id: number) => {
            scheduledEvents.delete(id);
        }),
        start: vi.fn((_time?: number, offset?: number) => {
            if (offset !== undefined) transport.seconds = offset;
            transport.state = 'started';
        }),
        pause: vi.fn(() => {
            transport.state = 'paused';
        }),
        stop: vi.fn(() => {
            transport.state = 'stopped';
            transport.seconds = 0;
        }),
    };
    const samplers: {
        options: Partial<SamplerOptions>;
        dispose: ReturnType<typeof vi.fn>;
        loaded: boolean;
        triggerAttack: ReturnType<typeof vi.fn>;
        triggerRelease: ReturnType<typeof vi.fn>;
        releaseAll: ReturnType<typeof vi.fn>;
    }[] = [];
    return {
        samplers,
        transport,
        context,
        scheduledEvents,
        completionTimers,
        resetEventIds: () => {
            nextEventId = 1;
            nextTimerId = 1;
        },
    };
});

vi.mock('tone', () => ({
    start: vi.fn(),
    getTransport: vi.fn(() => transport),
    getContext: vi.fn(() => context),
    now: vi.fn(() => 12),
    Midi: vi.fn((pitch: number) => ({
        toNote: () => {
            const notes: Record<number, string> = { 60: 'C4', 64: 'E4' };
            return notes[pitch];
        },
    })),
    Sampler: vi.fn(
        class {
            dispose = vi.fn();
            loaded = false;
            triggerAttack = vi.fn();
            triggerRelease = vi.fn();
            releaseAll = vi.fn();
            options: Partial<SamplerOptions>;
            constructor(options: Partial<SamplerOptions>) {
                this.options = {
                    ...options,
                    onload: () => {
                        this.loaded = true;
                        options.onload?.();
                    },
                };
                samplers.push(this);
            }
            toDestination() {
                return this;
            }
        },
    ),
}));
vi.mock('sonner', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/features/piano-roll/components/PianoRollCanvas', () => ({
    PianoRollCanvas: ({ playbackControls }: { playbackControls: ReactNode }) =>
        playbackControls,
}));
vi.mock('@/shared/components/ui/sonner', () => ({ Toaster: () => null }));

beforeEach(() => {
    samplers.length = 0;
    vi.clearAllMocks();
    scheduledEvents.clear();
    completionTimers.clear();
    resetEventIds();
    transport.state = 'stopped';
    transport.seconds = 0;
    transport.bpm.value = 120;
    useNoteStore.setState({ notes: {} });
    vi.mocked(Tone.start).mockResolvedValue(undefined);
});
afterEach(cleanup);

test('creates one sampler per effect lifetime and becomes ready only when samples load', () => {
    const { result, rerender } = renderHook(usePianoSampler);
    const sampler = samplers[0];
    expect(result.current.samplerRef.current).toBe(sampler);
    expect(result.current.samplesReady).toBe(false);
    expect(result.current.samplesFailed).toBe(false);
    expect(sampler.options.baseUrl).toBe(
        `${import.meta.env.BASE_URL}audio/piano/`,
    );
    expect(Tone.start).not.toHaveBeenCalled();

    rerender();
    expect(samplers).toHaveLength(1);
    act(() => sampler.options.onload?.());
    expect(result.current.samplesReady).toBe(true);
    expect(result.current.samplesFailed).toBe(false);
    expect(result.current.samplerRef.current).toBe(sampler);
    expect(samplers).toHaveLength(1);
});

test('reports a sample loading failure without claiming readiness', () => {
    const { result } = renderHook(usePianoSampler);
    act(() => samplers[0].options.onerror?.(new Error('Decode failed')));
    expect(result.current.samplesReady).toBe(false);
    expect(result.current.samplesFailed).toBe(true);
    expect(Tone.start).not.toHaveBeenCalled();
});

test('disposes the sampler, clears the ref, and ignores late callbacks on unmount', () => {
    const { result, unmount } = renderHook(usePianoSampler);
    const sampler = samplers[0];
    const samplerRef = result.current.samplerRef;
    unmount();
    expect(sampler.dispose).toHaveBeenCalledTimes(1);
    expect(samplerRef.current).toBeNull();
    act(() => {
        sampler.options.onload?.();
        sampler.options.onerror?.(new Error('Late failure'));
    });
    expect(result.current.samplesReady).toBe(false);
    expect(result.current.samplesFailed).toBe(false);
});

test('StrictMode cleanup prevents the discarded sampler from changing readiness', () => {
    const { result, unmount } = renderHook(usePianoSampler, {
        wrapper: StrictMode,
    });
    expect(samplers).toHaveLength(2);
    const [discarded, current] = samplers;
    expect(discarded.dispose).toHaveBeenCalledTimes(1);
    expect(result.current.samplerRef.current).toBe(current);

    act(() => {
        discarded.options.onload?.();
        discarded.options.onerror?.(new Error('Stale failure'));
    });
    expect(result.current.samplesReady).toBe(false);
    expect(result.current.samplesFailed).toBe(false);
    act(() => current.options.onload?.());
    expect(result.current.samplesReady).toBe(true);
    act(() => discarded.options.onerror?.(new Error('Another stale failure')));
    expect(result.current.samplesReady).toBe(true);
    expect(result.current.samplesFailed).toBe(false);

    unmount();
    expect(discarded.dispose).toHaveBeenCalledTimes(1);
    expect(current.dispose).toHaveBeenCalledTimes(1);
});

test('App connects actual readiness to the keyboard-operable Play button and toasts', async () => {
    const user = userEvent.setup();
    useNoteStore.getState().addNote({
        id: 'note-a',
        pitch: 60,
        startTick: 480,
        durationTicks: 240,
        velocity: 127,
        selected: false,
    });
    render(<App />);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(toast.info).toHaveBeenCalledWith(
        'Loading piano samples…',
        expect.any(Object),
    );
    expect(Tone.start).not.toHaveBeenCalled();
    expect(samplers[0].triggerAttack).not.toHaveBeenCalled();

    act(() => samplers[0].options.onload?.());
    expect(toast.success).toHaveBeenCalledWith(
        'Piano ready',
        expect.any(Object),
    );
    expect(Tone.start).not.toHaveBeenCalled();
    expect(samplers[0].triggerAttack).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Play' }),
    );
    await user.keyboard('{Enter}');
    expect(Tone.start).toHaveBeenCalledTimes(1);
    expect(transport.schedule).toHaveBeenCalledTimes(3);
    expect(scheduledEvents.get(1)?.position).toBe(0.75);
    expect(scheduledEvents.get(2)?.position).toBe(0.5);
    expect(scheduledEvents.get(3)?.position).toBe(0.75);
    expect(transport.start).toHaveBeenCalledWith(undefined, 0);
    expect(samplers[0].triggerAttack).not.toHaveBeenCalled();
    act(() => scheduledEvents.get(2)?.callback(12.375));
    expect(samplers[0].triggerAttack).toHaveBeenCalledTimes(1);
    expect(samplers[0].triggerAttack).toHaveBeenCalledWith('C4', 12.375, 1);
    act(() => scheduledEvents.get(1)?.callback(12.625));
    expect(samplers[0].triggerRelease).toHaveBeenCalledExactlyOnceWith(
        'C4',
        12.625,
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toBe(
        document.activeElement,
    );
});

test('pause releases voices and resume retriggers the held note while preserving events and position', async () => {
    const user = userEvent.setup();
    useNoteStore.getState().addNote({
        id: 'note-a',
        pitch: 60,
        startTick: 0,
        durationTicks: 480,
        velocity: 100,
        selected: false,
    });
    render(<App />);
    act(() => samplers[0].options.onload?.());
    const button = screen.getByRole('button', { name: 'Play' });
    await user.click(button);
    transport.seconds = 0.25;
    const event = scheduledEvents.get(1);

    await user.keyboard(' ');
    expect(transport.pause).toHaveBeenCalledTimes(1);
    expect(samplers[0].releaseAll).toHaveBeenCalledTimes(1);
    expect(samplers[0].releaseAll).toHaveBeenCalledWith(12);
    expect(screen.getByRole('button', { name: 'Play' })).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(transport.seconds).toBe(0.25);
    expect(scheduledEvents.get(1)).toBe(event);

    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Pause' })).toBe(button);
    expect(transport.start).toHaveBeenLastCalledWith(12);
    expect(samplers[0].triggerAttack).toHaveBeenCalledExactlyOnceWith(
        'C4',
        12,
        100 / 127,
    );
    expect(transport.seconds).toBe(0.25);
    expect(transport.schedule).toHaveBeenCalledTimes(3);
    expect(transport.clear).not.toHaveBeenCalled();
    expect(samplers).toHaveLength(1);
});

test('a new start clears the previous owned events and starts from zero', async () => {
    const user = userEvent.setup();
    useNoteStore.getState().addNote({
        id: 'note-a',
        pitch: 60,
        startTick: 0,
        durationTicks: 480,
        velocity: 100,
        selected: false,
    });
    render(<App />);
    act(() => samplers[0].options.onload?.());
    await user.click(screen.getByRole('button', { name: 'Play' }));
    transport.stop();
    transport.seconds = 5;
    scheduledEvents.set(999, { callback: vi.fn(), position: 10 });

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(transport.clear).toHaveBeenCalledWith(1);
    expect(transport.clear).toHaveBeenCalledWith(2);
    expect(transport.clear).toHaveBeenCalledWith(3);
    expect(transport.clear).not.toHaveBeenCalledWith(999);
    expect(scheduledEvents.has(1)).toBe(false);
    expect(scheduledEvents.has(2)).toBe(false);
    expect(scheduledEvents.has(3)).toBe(false);
    expect(scheduledEvents.has(4)).toBe(true);
    expect(scheduledEvents.has(5)).toBe(true);
    expect(scheduledEvents.has(6)).toBe(true);
    expect(scheduledEvents.has(999)).toBe(true);
    expect(transport.start).toHaveBeenLastCalledWith(undefined, 0);
    expect(transport.seconds).toBe(0);
});

test('unmount stops playback, clears owned events, and makes late callbacks harmless', async () => {
    const user = userEvent.setup();
    useNoteStore.getState().addNote({
        id: 'note-a',
        pitch: 60,
        startTick: 0,
        durationTicks: 480,
        velocity: 100,
        selected: false,
    });
    const { unmount } = render(<App />);
    act(() => samplers[0].options.onload?.());
    await user.click(screen.getByRole('button', { name: 'Play' }));
    const callback = scheduledEvents.get(2)?.callback;
    const releaseCallback = scheduledEvents.get(1)?.callback;
    act(() => scheduledEvents.get(3)?.callback(12.5));
    const finishCallback = completionTimers.get(1);
    scheduledEvents.set(999, { callback: vi.fn(), position: 10 });

    unmount();
    expect(transport.stop).toHaveBeenCalledTimes(1);
    expect(transport.clear).toHaveBeenCalledWith(1);
    expect(transport.clear).toHaveBeenCalledWith(2);
    expect(transport.clear).toHaveBeenCalledWith(3);
    expect(scheduledEvents.has(1)).toBe(false);
    expect(scheduledEvents.has(999)).toBe(true);
    expect(samplers[0].dispose).toHaveBeenCalledTimes(1);
    expect(context.clearTimeout).toHaveBeenCalledWith(1);
    expect(completionTimers.size).toBe(0);
    act(() => {
        callback?.(15);
        releaseCallback?.(15.5);
        finishCallback?.();
    });
    expect(transport.stop).toHaveBeenCalledTimes(1);
    expect(samplers[0].triggerAttack).not.toHaveBeenCalled();
    expect(samplers[0].triggerRelease).not.toHaveBeenCalled();
});

test('resume retriggers the captured overlapping notes but leaves boundary and future notes scheduled', async () => {
    const user = userEvent.setup();
    const base = {
        pitch: 60,
        startTick: 0,
        durationTicks: 480,
        velocity: 100,
        selected: false,
    };
    const notes = [
        { ...base, id: 'ended' },
        { ...base, id: 'held-a', startTick: 240, durationTicks: 720 },
        { ...base, id: 'held-b', pitch: 64, durationTicks: 960, velocity: 50 },
        { ...base, id: 'boundary', startTick: 480 },
        { ...base, id: 'future', startTick: 960 },
    ];
    useNoteStore.setState({
        notes: Object.fromEntries(notes.map((note) => [note.id, note])),
    });
    render(<App />);
    act(() => samplers[0].options.onload?.());
    await user.click(screen.getByRole('button', { name: 'Play' }));
    transport.seconds = 0.5;
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    const events = [...scheduledEvents.entries()];
    useNoteStore.setState({ notes: {} });

    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(samplers[0].triggerAttack.mock.calls).toEqual([
        ['C4', 12, 100 / 127],
        ['E4', 12, 50 / 127],
    ]);
    expect([...scheduledEvents.entries()]).toEqual(events);
    expect(transport.schedule).toHaveBeenCalledTimes(9);
    expect(transport.clear).not.toHaveBeenCalled();
});

test('repeated resumes preserve the original note-off endpoint', async () => {
    const user = userEvent.setup();
    useNoteStore.getState().addNote({
        id: 'held',
        pitch: 60,
        startTick: 0,
        durationTicks: 480,
        velocity: 127,
        selected: false,
    });
    render(<App />);
    act(() => samplers[0].options.onload?.());
    await user.click(screen.getByRole('button', { name: 'Play' }));
    for (const position of [0.25, 0.375]) {
        transport.seconds = position;
        await user.click(screen.getByRole('button', { name: 'Pause' }));
        await user.click(screen.getByRole('button', { name: 'Play' }));
    }
    expect(samplers[0].triggerAttack.mock.calls).toEqual([
        ['C4', 12, 1],
        ['C4', 12, 1],
    ]);
    expect(transport.schedule).toHaveBeenCalledTimes(3);
    expect(scheduledEvents.get(1)?.position).toBe(0.5);
    act(() => scheduledEvents.get(1)?.callback(13));
    expect(samplers[0].triggerRelease).toHaveBeenCalledExactlyOnceWith(
        'C4',
        13,
    );
    expect(useNoteStore.getState().notes.held.durationTicks).toBe(480);
});

test('completion waits for the audible endpoint, resets Play, and allows a fresh replay', async () => {
    const user = userEvent.setup();
    const base = {
        pitch: 60,
        startTick: 0,
        durationTicks: 960,
        velocity: 127,
        selected: false,
    };
    useNoteStore.setState({
        notes: {
            long: { ...base, id: 'long' },
            later: {
                ...base,
                id: 'later',
                pitch: 64,
                startTick: 480,
                durationTicks: 120,
            },
        },
    });
    render(<App />);
    act(() => samplers[0].options.onload?.());
    const button = screen.getByRole('button', { name: 'Play' });
    await user.click(button);
    expect(scheduledEvents.get(5)?.position).toBe(1);
    const oldAttack = scheduledEvents.get(3)?.callback;
    scheduledEvents.set(999, { callback: vi.fn(), position: 10 });

    act(() => scheduledEvents.get(5)?.callback(13));
    expect(context.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        expect.closeTo(1.1),
    );
    expect(transport.stop).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pause' })).toBe(button);
    act(() => completionTimers.get(1)?.());

    expect(transport.stop).toHaveBeenCalledExactlyOnceWith(13);
    expect(transport.seconds).toBe(0);
    expect(screen.getByRole('button', { name: 'Play' })).toBe(button);
    expect(document.activeElement).toBe(button);
    expect([...scheduledEvents.keys()]).toEqual([999]);
    useNoteStore.setState({
        notes: {
            replay: { ...base, id: 'replay', pitch: 64, durationTicks: 480 },
        },
    });
    await user.keyboard('{Enter}');
    expect(transport.start).toHaveBeenLastCalledWith(undefined, 0);
    expect(transport.schedule).toHaveBeenCalledTimes(8);
    expect(scheduledEvents.get(7)?.position).toBe(0);
    expect(scheduledEvents.get(8)?.position).toBe(0.5);
    act(() => {
        oldAttack?.(14);
        scheduledEvents.get(7)?.callback(14);
    });
    expect(samplers[0].triggerAttack).toHaveBeenCalledExactlyOnceWith(
        'E4',
        14,
        1,
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toBe(button);
});

test('pausing cancels a pending completion and ignores its callback after resume', async () => {
    const user = userEvent.setup();
    useNoteStore.getState().addNote({
        id: 'held',
        pitch: 60,
        startTick: 0,
        durationTicks: 480,
        velocity: 127,
        selected: false,
    });
    render(<App />);
    act(() => samplers[0].options.onload?.());
    await user.click(screen.getByRole('button', { name: 'Play' }));
    act(() => scheduledEvents.get(3)?.callback(12.5));
    const staleFinish = completionTimers.get(1);
    transport.seconds = 0.4;
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(context.clearTimeout).toHaveBeenCalledWith(1);
    expect(completionTimers.size).toBe(0);
    await user.click(screen.getByRole('button', { name: 'Play' }));
    act(() => staleFinish?.());
    expect(transport.stop).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pause' })).toBe(
        document.activeElement,
    );

    act(() => scheduledEvents.get(3)?.callback(14));
    act(() => completionTimers.get(2)?.());
    expect(transport.stop).toHaveBeenCalledExactlyOnceWith(14);
    expect(screen.getByRole('button', { name: 'Play' })).toBe(
        document.activeElement,
    );
});

test('a toggle at the endpoint finishes rather than leaving playback paused beyond its end', async () => {
    const user = userEvent.setup();
    useNoteStore.getState().addNote({
        id: 'held',
        pitch: 60,
        startTick: 0,
        durationTicks: 480,
        velocity: 127,
        selected: false,
    });
    render(<App />);
    act(() => samplers[0].options.onload?.());
    await user.click(screen.getByRole('button', { name: 'Play' }));
    act(() => scheduledEvents.get(3)?.callback(12.5));
    const staleFinish = completionTimers.get(1);
    transport.seconds = 0.5;
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(transport.pause).not.toHaveBeenCalled();
    expect(transport.stop).toHaveBeenCalledExactlyOnceWith(12);
    expect(scheduledEvents.size).toBe(0);
    expect(screen.getByRole('button', { name: 'Play' })).toBe(
        document.activeElement,
    );
    await user.keyboard('{Enter}');
    act(() => staleFinish?.());
    expect(transport.start).toHaveBeenCalledTimes(2);
    expect(transport.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Pause' })).toBe(
        document.activeElement,
    );
});

test('an empty project stays ready to play without scheduling an endless transport', async () => {
    const user = userEvent.setup();
    render(<App />);
    act(() => samplers[0].options.onload?.());
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(transport.start).not.toHaveBeenCalled();
    expect(transport.schedule).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play' })).toBe(
        document.activeElement,
    );
});
