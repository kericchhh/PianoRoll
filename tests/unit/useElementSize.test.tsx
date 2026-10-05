// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useElementSize } from '@/shared/hooks/useElementSize';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

test('measures layout changes, ignores empty sizes, and disconnects on unmount', () => {
    let onResize: ((entries: ResizeObserverEntry[]) => void) | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
        'ResizeObserver',
        class {
            constructor(callback: (entries: ResizeObserverEntry[]) => void) {
                onResize = callback;
            }
            observe = observe;
            disconnect = disconnect;
        },
    );
    const ref = { current: document.createElement('div') };
    const { result, unmount } = renderHook(() =>
        useElementSize(ref, { width: 600, height: 240 }),
    );
    expect(observe).toHaveBeenCalledWith(ref.current);
    function resize(width: number, height: number) {
        act(() =>
            onResize?.([
                { contentRect: { width, height } } as ResizeObserverEntry,
            ]),
        );
    }
    resize(1100.8, 700.5);
    expect(result.current).toEqual({ width: 1100, height: 700 });
    const measured = result.current;
    resize(1100.8, 700.5);
    expect(result.current).toBe(measured);
    resize(0, 0);
    expect(result.current).toBe(measured);
    resize(800, 500);
    expect(result.current).toEqual({ width: 800, height: 500 });
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
});

test('keeps the fallback dimensions when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() =>
        useElementSize(ref, { width: 600, height: 240 }),
    );
    expect(result.current).toEqual({ width: 600, height: 240 });
});
