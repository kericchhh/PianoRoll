import { expect, test, vi } from 'vitest';
import { drawTimeLine } from '@/features/piano-roll/rendering/drawTimeLine';
import {
    drawPitchBackgrounds,
    drawPitchRows,
} from '@/features/piano-roll/rendering/drawPitchRows';

test('grid passes establish stroke width instead of inheriting note outline styles', () => {
    const context = {
        lineWidth: 2,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
    };
    drawTimeLine(context as unknown as CanvasRenderingContext2D, 0, 240);
    expect(context.lineWidth).toBe(1);
    context.lineWidth = 2;
    drawPitchRows(context as unknown as CanvasRenderingContext2D, 600, 240, 20);
    expect(context.lineWidth).toBe(1);
});

test('black-key backgrounds follow visible pitch rows and clip the partial bottom row', () => {
    const context = { fillRect: vi.fn() };
    drawPitchBackgrounds(
        context as unknown as CanvasRenderingContext2D,
        600,
        55,
        {
            highestVisiblePitch: 72,
            rowHeight: 20,
        },
    );
    expect(context.fillRect.mock.calls).toEqual([[0, 40, 600, 15]]);

    context.fillRect.mockClear();
    drawPitchBackgrounds(
        context as unknown as CanvasRenderingContext2D,
        600,
        55,
        {
            highestVisiblePitch: 61,
            rowHeight: 20,
        },
    );
    expect(context.fillRect.mock.calls).toEqual([[0, 0, 600, 20]]);
});

test('backgrounds stop at MIDI zero even when the canvas has more rows', () => {
    const context = { fillRect: vi.fn() };
    drawPitchBackgrounds(
        context as unknown as CanvasRenderingContext2D,
        600,
        240,
        {
            highestVisiblePitch: 1,
            rowHeight: 20,
        },
    );
    expect(context.fillRect.mock.calls).toEqual([[0, 0, 600, 20]]);
});
