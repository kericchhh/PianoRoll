import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useCanvasRenderer } from '@/features/piano-roll/hooks/editor/useCanvasRenderer';
import { createNoteIndex } from '@/features/piano-roll/utils/notes/noteIndex';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

test('a redraw measures the canvas once before changing overlay styles and retains CSS-scaled bounds', () => {
    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        frame = callback;
        return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const events: string[] = [];
    const context = {
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
    };
    const canvas = {
        width: 0,
        height: 0,
        style: {},
        getContext: () => context,
    } as unknown as HTMLCanvasElement;
    for (const [property, value] of Object.entries({
        clientWidth: 300,
        clientHeight: 120,
        clientLeft: 2,
        clientTop: 3,
    })) {
        Object.defineProperty(canvas, property, {
            get: () => {
                events.push(`read:${property}`);
                return value;
            },
        });
    }
    const style: Record<string, string> = {};
    const overlay = {
        contains: () => false,
        style: new Proxy(style, {
            set: (target, property: string, value: string) => {
                events.push(`write:${property}`);
                target[property] = value;
                return true;
            },
        }),
    } as unknown as HTMLDivElement;
    const index = createNoteIndex({
        selected: {
            id: 'selected',
            pitch: 71,
            startTick: 120,
            durationTicks: 240,
            velocity: 80,
            selected: true,
        },
    });
    renderHook(() =>
        useCanvasRenderer({
            editorRef: { current: null },
            canvasRef: { current: canvas },
            overlayRef: { current: overlay },
            activeNoteRef: { current: 'selected' },
            previewRef: { current: null },
            marqueeRef: { current: null },
            index,
            getView: () => ({
                pixelsPerTick: 0.5,
                scrollOffsetX: 0,
                highestVisiblePitch: 72,
                rowHeight: 20,
            }),
            width: 600,
            height: 240,
            endTick: 15360,
        }),
    );
    events.length = 0;
    act(() => frame?.(0));
    expect(style).toEqual({
        display: 'block',
        left: '32px',
        top: '13px',
        width: '60px',
        height: '10px',
    });
    const reads = events.filter((event) => event.startsWith('read:'));
    expect(reads).toHaveLength(4);
    expect(new Set(reads).size).toBe(4);
    expect(events.findIndex((event) => event.startsWith('write:'))).toBe(4);
});
