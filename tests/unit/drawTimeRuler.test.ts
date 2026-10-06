import { expect, test, vi } from 'vitest';
import { drawTimeRuler } from '@/features/piano-roll/rendering/grid/drawTimeRuler';
import type { PianoRollView } from '@/features/piano-roll/types';

const view: PianoRollView = {
    pixelsPerTick: 0.5,
    scrollOffsetX: 0,
    highestVisiblePitch: 72,
    rowHeight: 20,
};
function draw(
    width: number,
    endTick: number,
    overrides: Partial<PianoRollView> = {},
) {
    const context = {
        clearRect: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
    };
    drawTimeRuler(
        context as unknown as CanvasRenderingContext2D,
        width,
        32,
        { ...view, ...overrides },
        endTick,
    );
    return context;
}

test('bar labels align with their tick coordinates', () => {
    const context = draw(2200, 15360);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 2200, 32);
    expect(context.fillText.mock.calls).toEqual([
        ['1', 8, 16],
        ['2', 968, 16],
        ['3', 1928, 16],
    ]);
    expect(context.moveTo.mock.calls).toEqual([
        [0, 27],
        [960, 27],
        [1920, 27],
    ]);
});

test('panning shows the next visible bar using its original bar number', () => {
    const context = draw(1700, 15360, { scrollOffsetX: 400 });
    expect(context.fillText.mock.calls).toEqual([
        ['2', 568, 16],
        ['3', 1528, 16],
    ]);
});

test('labels stop at the selected timeline endpoint', () => {
    const context = draw(3000, 3840);
    expect(context.fillText.mock.calls).toEqual([
        ['1', 8, 16],
        ['2', 968, 16],
    ]);
});

test('zooming out skips bars to keep labels at least 64 pixels apart', () => {
    const context = draw(300, 15360, { pixelsPerTick: 0.02 });
    const labels = context.fillText.mock.calls;
    expect(labels.map(([label]) => label)).toEqual(['1', '3', '5', '7']);
    for (let i = 1; i < labels.length; i++) {
        expect(labels[i][1] - labels[i - 1][1]).toBeGreaterThanOrEqual(64);
    }
});
