import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

test('reduced motion reflects the initial and live system preference and unsubscribes on unmount', () => {
    let reduced = true;
    const events = new EventTarget();
    const removeEventListener = vi.spyOn(events, 'removeEventListener');
    vi.stubGlobal('matchMedia', () => ({
        get matches() {
            return reduced;
        },
        addEventListener: events.addEventListener.bind(events),
        removeEventListener: events.removeEventListener.bind(events),
    }));
    const { result, unmount } = renderHook(usePrefersReducedMotion);
    expect(result.current).toBe(true);
    act(() => {
        reduced = false;
        events.dispatchEvent(new Event('change'));
    });
    expect(result.current).toBe(false);
    act(() => {
        reduced = true;
        events.dispatchEvent(new Event('change'));
    });
    expect(result.current).toBe(true);
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
    );
});

test('browsers without matchMedia retain a stable fallback', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(usePrefersReducedMotion);
    expect(result.current).toBe(false);
});
