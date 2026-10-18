// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { FxAudioContext } from '@/features/piano-roll/components/fx/FxAudioContext';
import { OutputMeter } from '@/features/piano-roll/components/fx/OutputMeter';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

test('meter reads the shared post-FX tap without React frame updates or rapid ARIA changes', () => {
    vi.useFakeTimers();
    let samples = new Float32Array([0]);
    const getSamples = vi.fn(() => samples);
    const view = render(
        <FxAudioContext.Provider value={getSamples}>
            <OutputMeter />
        </FxAudioContext.Provider>,
    );
    const meter = screen.getByRole('meter', { name: 'Output peak' });
    expect(meter.getAttribute('aria-valuetext')).toBe('Silent');
    samples = new Float32Array([0.5]);
    act(() => vi.advanceTimersByTime(70));
    expect(view.container.querySelectorAll('[data-lit="true"]').length).toBe(
        11,
    );
    expect(meter.getAttribute('aria-valuetext')).toBe('Silent');
    act(() => vi.advanceTimersByTime(1000));
    expect(meter.getAttribute('aria-valuetext')).toBe('-6 dBFS');
    view.unmount();
    const reads = getSamples.mock.calls.length;
    act(() => vi.advanceTimersByTime(1000));
    expect(getSamples).toHaveBeenCalledTimes(reads);
});

test('meter samples only while it is visible', () => {
    vi.useFakeTimers();
    let notifyIntersection: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(callback: IntersectionObserverCallback) {
                notifyIntersection = callback;
            }
            observe() {}
            disconnect = disconnect;
        },
    );
    const getSamples = vi.fn(() => new Float32Array([0.5]));
    const view = render(
        <FxAudioContext.Provider value={getSamples}>
            <OutputMeter />
        </FxAudioContext.Provider>,
    );
    const show = (visible: boolean) =>
        act(() =>
            notifyIntersection?.(
                [{ isIntersecting: visible } as IntersectionObserverEntry],
                {} as IntersectionObserver,
            ),
        );
    act(() => vi.advanceTimersByTime(200));
    expect(getSamples).not.toHaveBeenCalled();
    show(true);
    act(() => vi.advanceTimersByTime(70));
    expect(getSamples).toHaveBeenCalled();
    show(false);
    const reads = getSamples.mock.calls.length;
    act(() => vi.advanceTimersByTime(1000));
    expect(getSamples).toHaveBeenCalledTimes(reads);
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
});
