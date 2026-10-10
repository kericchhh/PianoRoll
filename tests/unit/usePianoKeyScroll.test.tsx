// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useWheel } from '@use-gesture/react';
import { usePianoKeyScroll } from '@/features/piano-roll/hooks/editor/usePianoKeyScroll';
import type { GestureMode } from '@/features/piano-roll/types';
import { animationHarness } from './animationHarness';

vi.mock('@use-gesture/react', () => ({ useWheel: vi.fn() }));
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function setup() {
    const animation = animationHarness();
    const onScroll = vi.fn();
    const beforeScroll = vi.fn();
    const gestureModeRef = { current: 'idle' as GestureMode };
    const hook = renderHook(() =>
        usePianoKeyScroll({
            target: { current: document.createElement('div') },
            height: 400,
            onScroll,
            beforeScroll,
            gestureModeRef,
        }),
    );
    const wheel = vi.mocked(useWheel).mock.calls[0][0];
    function scroll(deltaY: number, modifiers: WheelEventInit = {}) {
        const event = new WheelEvent('wheel', {
            deltaY,
            cancelable: true,
            ...modifiers,
        });
        act(() => wheel({ event, last: false } as Parameters<typeof wheel>[0]));
        return event;
    }
    return { animation, onScroll, beforeScroll, gestureModeRef, hook, scroll };
}

test('rapid wheel events batch into one frame and preserve sub-row movement', () => {
    const { scroll, animation, onScroll, beforeScroll } = setup();
    expect(scroll(15).defaultPrevented).toBe(true);
    scroll(15);
    scroll(15);
    expect(onScroll).not.toHaveBeenCalled();
    expect(animation.frames.size).toBe(1);
    act(() => animation.advance());
    expect(onScroll).toHaveBeenCalledExactlyOnceWith(-2);
    expect(beforeScroll).toHaveBeenCalledExactlyOnceWith(-2);
    scroll(15);
    act(() => animation.advance());
    expect(onScroll).toHaveBeenLastCalledWith(-1);
});

test('modified wheels retain their native behavior and active gestures block pitch changes', () => {
    const { scroll, animation, onScroll, gestureModeRef } = setup();
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
        expect(scroll(100, { [modifier]: true }).defaultPrevented).toBe(false);
    }
    gestureModeRef.current = 'move';
    expect(scroll(100).defaultPrevented).toBe(true);
    act(() => animation.advance());
    expect(onScroll).not.toHaveBeenCalled();
});

test('a gesture starting before the wheel frame blocks the queued pitch change', () => {
    const { scroll, animation, onScroll, gestureModeRef } = setup();
    scroll(100);
    gestureModeRef.current = 'move';
    act(() => animation.advance());
    expect(onScroll).not.toHaveBeenCalled();
    gestureModeRef.current = 'idle';
    scroll(20);
    act(() => animation.advance());
    expect(onScroll).toHaveBeenCalledExactlyOnceWith(-1);
});

test('unmount cancels pending wheel work', () => {
    const { scroll, animation, onScroll, hook } = setup();
    scroll(100);
    hook.unmount();
    act(() => animation.advance());
    expect(animation.frames.size).toBe(0);
    expect(onScroll).not.toHaveBeenCalled();
});
