import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useWaveformRenderer } from '@/features/piano-roll/hooks/playback/useWaveformRenderer';
import { animationHarness } from './animationHarness';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function setup(isPlaying = false, reduced = false) {
    const animation = animationHarness();
    let changed: (() => void) | undefined;
    const preference = {
        matches: reduced,
        addEventListener: vi.fn((_event: string, listener: () => void) => {
            changed = listener;
        }),
        removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => preference),
    );
    const getSamples = vi.fn(() => new Float32Array([0, 1, -1]));
    let renderCount = 0;
    const hook = renderHook(
        ({ playing }) => {
            renderCount++;
            useWaveformRenderer({
                canvasRef: animation.canvasRef,
                width: 192,
                height: 34,
                isPlaying: playing,
                getSamples,
            });
        },
        { initialProps: { playing: isPlaying } },
    );
    return {
        ...animation,
        ...hook,
        getSamples,
        preference,
        renders: () => renderCount,
        changeMotion(reduce: boolean) {
            preference.matches = reduce;
            changed?.();
        },
    };
}

test('waveform stays idle until playback and samples audio without per-frame React updates', () => {
    const model = setup();
    expect(model.frames.size).toBe(0);
    expect(model.getSamples).not.toHaveBeenCalled();
    model.rerender({ playing: true });
    const reads = model.getSamples.mock.calls.length;
    act(() => model.advance());
    expect(model.getSamples.mock.calls.length).toBe(reads + 1);
    expect(model.renders()).toBe(2);
    expect(model.frames.size).toBe(1);
    model.unmount();
    expect(model.frames.size).toBe(0);
    expect(model.preference.removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
    );
});

test('pause shows the release tail then clears to the baseline and stops reading audio', () => {
    const model = setup(true);
    model.rerender({ playing: false });
    act(() => model.advance(1000));
    expect(model.frames.size).toBe(1);
    const reads = model.getSamples.mock.calls.length;
    model.context.lineTo.mockClear();
    act(() => model.advance(600));
    expect(model.frames.size).toBe(0);
    expect(model.getSamples.mock.calls.length).toBe(reads);
    expect(model.context.lineTo.mock.calls).toEqual([[192, 17]]);
});

test('reduced motion avoids audio polling and responds to preference changes during playback', () => {
    const model = setup(true, true);
    expect(model.getSamples).not.toHaveBeenCalled();
    expect(model.frames.size).toBe(0);
    act(() => model.changeMotion(false));
    expect(model.getSamples).toHaveBeenCalledOnce();
    expect(model.frames.size).toBe(1);
    act(() => model.changeMotion(true));
    expect(model.frames.size).toBe(0);
    expect(model.getSamples).toHaveBeenCalledOnce();
});
