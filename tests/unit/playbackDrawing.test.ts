import { expect, test, vi } from 'vitest';
import { drawPlayhead } from '@/features/piano-roll/rendering/playback/drawPlayhead';
import { drawWaveform } from '@/features/piano-roll/rendering/playback/drawWaveform';
import { scrollForPlayhead } from '@/features/piano-roll/utils/viewport/scrollForPlayhead';
import { RULER_HEIGHT } from '@/features/piano-roll/constants';

function createContext() {
    return {
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 0,
    };
}

test('playhead clears its previous position and draws the ruler marker above the grid line', () => {
    const context = createContext();
    drawPlayhead(context as unknown as CanvasRenderingContext2D, 150, 800, 432);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 800, 432);
    expect(context.moveTo.mock.calls).toEqual([
        [150, RULER_HEIGHT],
        [145, RULER_HEIGHT - 9],
    ]);
    expect(context.lineTo.mock.calls).toEqual([
        [150, 432],
        [155, RULER_HEIGHT - 9],
        [150, RULER_HEIGHT],
    ]);
    expect(context.stroke).toHaveBeenCalledTimes(2);
    expect(context.strokeStyle).toBe('#f1eee7');
    expect(context.fill).toHaveBeenCalledTimes(1);
});

test.each([-1, 801, NaN, Infinity])(
    'offscreen or invalid playhead %s clears without drawing',
    (x) => {
        const context = createContext();
        drawPlayhead(
            context as unknown as CanvasRenderingContext2D,
            x,
            800,
            432,
        );
        expect(context.clearRect).toHaveBeenCalledOnce();
        expect(context.stroke).not.toHaveBeenCalled();
    },
);

test.each([
    [0, 1],
    [800, 799],
])('playhead at endpoint %s stays visible inside the canvas', (x, expected) => {
    const context = createContext();
    drawPlayhead(context as unknown as CanvasRenderingContext2D, x, 800, 432);
    expect(context.moveTo).toHaveBeenCalledWith(expected, RULER_HEIGHT);
});

test('waveform maps audio amplitudes to a centered trace without changing the samples', () => {
    const context = createContext();
    const samples = new Float32Array([0, 1, -1, 2, NaN]);
    drawWaveform(
        context as unknown as CanvasRenderingContext2D,
        samples,
        100,
        40,
    );
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 100, 40);
    expect(context.moveTo.mock.calls).toEqual([
        [0, 20],
        [0, 20],
    ]);
    expect(context.lineTo.mock.calls).toEqual([
        [100, 20],
        [25, 4],
        [50, 36],
        [75, 4],
        [100, 20],
    ]);
    expect(context.strokeStyle).toBe('#e4a0bd');
    expect(Array.from(samples)).toEqual([0, 1, -1, 2, NaN]);
});

test('quiet piano audio is visible at a fixed sensitivity without changing its samples', () => {
    const context = createContext();
    const samples = new Float32Array([0.125, -0.125]);
    drawWaveform(
        context as unknown as CanvasRenderingContext2D,
        samples,
        100,
        40,
    );
    expect(context.moveTo).toHaveBeenCalledWith(0, 12);
    expect(context.lineTo).toHaveBeenCalledWith(100, 28);
    expect(Array.from(samples)).toEqual([0.125, -0.125]);
});

test.each([null, new Float32Array(), new Float32Array([1])])(
    'idle or insufficient samples draw only the baseline',
    (samples) => {
        const context = createContext();
        drawWaveform(
            context as unknown as CanvasRenderingContext2D,
            samples,
            100,
            40,
        );
        expect(context.stroke).toHaveBeenCalledOnce();
        expect(context.strokeStyle).toBe('#343432');
    },
);

test('automatic follow leaves the visible playhead and manual pan alone', () => {
    const view = { pixelsPerTick: 0.5, scrollOffsetX: 300 };
    expect(scrollForPlayhead(1000, view, 800, 7680)).toBe(300);
    expect(scrollForPlayhead(600, view, 800, 7680)).toBe(300);
});

test('automatic follow pages forward before clipping and puts the runner near the left edge', () => {
    const view = { pixelsPerTick: 0.5, scrollOffsetX: 300 };
    expect(scrollForPlayhead(2184, view, 800, 7680)).toBe(972);
    expect(scrollForPlayhead(5000, view, 800, 7680)).toBe(2380);
});

test('automatic follow accounts for zoom and clamps both timeline bounds', () => {
    expect(
        scrollForPlayhead(
            2000,
            { pixelsPerTick: 2, scrollOffsetX: 0 },
            800,
            7680,
        ),
    ).toBe(3880);
    expect(
        scrollForPlayhead(
            0,
            { pixelsPerTick: 0.5, scrollOffsetX: 300 },
            800,
            7680,
        ),
    ).toBe(0);
    expect(
        scrollForPlayhead(
            7680,
            { pixelsPerTick: 0.5, scrollOffsetX: 0 },
            800,
            7680,
        ),
    ).toBe(3040);
    expect(
        scrollForPlayhead(
            7680,
            { pixelsPerTick: 0.1, scrollOffsetX: 0 },
            800,
            7680,
        ),
    ).toBe(0);
});
