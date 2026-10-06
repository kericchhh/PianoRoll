import { expect, test, vi } from 'vitest';
import { drawNote } from '@/features/piano-roll/rendering/notes/drawNote';
import { PIANO_ROLL_COLORS } from '@/features/piano-roll/rendering/colors';

function makeContext() {
    const fillRect = vi.fn();
    const strokeRect = vi.fn();
    const context = {
        fillRect,
        strokeRect,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
    } as unknown as CanvasRenderingContext2D;
    return { context, fillRect, strokeRect };
}

const view = {
    pixelsPerTick: 0.5,
    scrollOffsetX: 0,
    highestVisiblePitch: 72,
    rowHeight: 20,
};

test('draws a selected note with a visible outline', () => {
    const { context, fillRect, strokeRect } = makeContext();
    drawNote(
        context,
        { pitch: 71, startTick: 120, durationTicks: 120, selected: true },
        view,
    );

    expect(fillRect).toHaveBeenCalledWith(60, 20, 60, 20);
    expect(strokeRect).toHaveBeenCalledWith(61, 21, 58, 18);
    expect(context.strokeStyle).toBe(PIANO_ROLL_COLORS.selectedOutline);
});

test('draws a thin inset border separating adjacent unselected notes', () => {
    const { context, strokeRect } = makeContext();
    drawNote(
        context,
        { pitch: 71, startTick: 120, durationTicks: 120, selected: false },
        view,
    );

    expect(strokeRect).toHaveBeenCalledWith(60.5, 20.5, 59, 19);
    expect(context.lineWidth).toBe(1);
    expect(context.strokeStyle).toBe(PIANO_ROLL_COLORS.noteOutline);
});

test('draws an unselected origin ghost with its supplied color', () => {
    const { context, fillRect, strokeRect } = makeContext();
    drawNote(
        context,
        { pitch: 71, startTick: 120, durationTicks: 120, selected: false },
        view,
        PIANO_ROLL_COLORS.ghost,
    );

    expect(context.fillStyle).toBe(PIANO_ROLL_COLORS.ghost);
    expect(fillRect).toHaveBeenCalledWith(60, 20, 60, 20);
    expect(strokeRect).not.toHaveBeenCalled();
});

test('keeps a selected note outline inside its bounds at the 32-bar minimum zoom', () => {
    const { context, strokeRect } = makeContext();
    const scale = 600 / (32 * 4 * 480);
    drawNote(
        context,
        { pitch: 72, startTick: 0, durationTicks: 120, selected: true },
        { ...view, pixelsPerTick: scale },
    );
    const [x, , width] = strokeRect.mock.calls[0];
    expect(width).toBeGreaterThan(0);
    expect(x - context.lineWidth / 2).toBeCloseTo(0);
    expect(x + width + context.lineWidth / 2).toBeCloseTo(120 * scale);
});
