import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { PlaybackState } from '@/features/piano-roll/audio/playbackTypes';
import { usePlayheadRenderer } from '@/features/piano-roll/hooks/playback/usePlayheadRenderer';
import { animationHarness } from './animationHarness';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function setup(initialState: PlaybackState = 'playing') {
    const animation = animationHarness();
    let tick = 0;
    const drawRef = { current: null as (() => void) | null };
    const scaleRef = { current: 0.5 };
    const scrollRef = { current: 0 };
    const requestRedraw = vi.fn();
    const getPlaybackTick = vi.fn(() => tick);
    const viewport = {
        editorRef: { current: null },
        scaleRef,
        scrollRef,
        highestPitch: 72,
        width: 800,
        height: 400,
        reveal: vi.fn(),
        clamp: vi.fn(),
        getView: () => ({
            pixelsPerTick: scaleRef.current,
            scrollOffsetX: scrollRef.current,
            highestVisiblePitch: 72,
            rowHeight: 20,
        }),
    };
    let renderCount = 0;
    const hook = renderHook(
        ({ state, width }) => {
            renderCount++;
            usePlayheadRenderer({
                canvasRef: animation.canvasRef,
                drawRef,
                viewport: { ...viewport, width },
                endTick: 7680,
                playbackState: state,
                getPlaybackTick,
                requestRedraw,
            });
        },
        { initialProps: { state: initialState, width: 800 } },
    );
    return {
        ...animation,
        ...hook,
        drawRef,
        scaleRef,
        scrollRef,
        requestRedraw,
        setTick(value: number) {
            tick = value;
        },
        renders: () => renderCount,
    };
}

test('playback paints the authoritative tick without React renders or grid redraws until it needs to follow', () => {
    const model = setup();
    model.setTick(960);
    act(() => model.advance());
    expect(model.canvas.dataset.tick).toBe('960.000');
    expect(model.canvas.dataset.x).toBe('480.000');
    expect(model.renders()).toBe(1);
    expect(model.requestRedraw).not.toHaveBeenCalled();
    model.setTick(1600);
    act(() => model.advance());
    expect(model.scrollRef.current).toBe(680);
    expect(model.canvas.dataset.x).toBe('120.000');
    expect(model.requestRedraw).toHaveBeenCalledOnce();
    expect(model.renders()).toBe(1);
    model.unmount();
    expect(model.frames.size).toBe(0);
    expect(model.drawRef.current).toBeNull();
});

test('pausing settles even when the raw tick has not begun advancing, then stops its frame loop', () => {
    const model = setup();
    model.rerender({ state: 'paused', width: 800 });
    act(() => {
        model.advance(16);
        model.advance(16);
    });
    expect(model.frames.size).toBe(1);
    model.setTick(120);
    act(() => model.advance(80));
    expect(model.canvas.dataset.tick).toBe('120.000');
    act(() => model.advance(150));
    expect(model.frames.size).toBe(0);
    model.rerender({ state: 'playing', width: 800 });
    model.setTick(240);
    act(() => model.advance());
    expect(model.canvas.dataset.tick).toBe('240.000');
    expect(model.frames.size).toBe(1);
});

test('on-demand drawing tracks zoom and pan while paused without overriding the manual view', () => {
    const model = setup('paused');
    model.setTick(480);
    act(() => model.advance(300));
    model.scaleRef.current = 2;
    model.scrollRef.current = 800;
    act(() => model.drawRef.current?.());
    expect(model.canvas.dataset.x).toBe('160.000');
    expect(model.scrollRef.current).toBe(800);
    expect(model.requestRedraw).not.toHaveBeenCalled();
    model.rerender({ state: 'paused', width: 1000 });
    expect(model.canvas.width).toBe(1000);
    expect(model.canvas.dataset.x).toBe('160.000');
});

test('completion resets the view after the scheduled stop reaches tick zero, then permits manual pan', () => {
    const model = setup();
    model.setTick(2400);
    act(() => model.advance());
    expect(model.scrollRef.current).toBeGreaterThan(0);
    model.rerender({ state: 'stopped', width: 800 });
    act(() => model.advance(50));
    model.setTick(0);
    act(() => model.advance(100));
    expect(model.scrollRef.current).toBe(0);
    expect(model.canvas.dataset.x).toBe('0.000');
    act(() => model.advance(100));
    expect(model.frames.size).toBe(0);
    model.scrollRef.current = 300;
    act(() => model.drawRef.current?.());
    expect(model.scrollRef.current).toBe(300);
    expect(model.canvas.dataset.x).toBe('-300.000');
});
