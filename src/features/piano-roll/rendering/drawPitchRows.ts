import { PIANO_ROLL_COLORS } from './colors';
import type { PianoRollView } from '@/features/piano-roll/types';
import { isBlackKey } from '@/features/piano-roll/utils/isBlackKey';

export function drawPitchRows(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    rowHeight: number,
): void {
    context.lineWidth = 1;
    context.beginPath();

    for (let y = 0; y <= height; y += rowHeight) {
        context.moveTo(0, y);
        context.lineTo(width, y);
    }

    context.strokeStyle = PIANO_ROLL_COLORS.pitchGrid;
    context.stroke();
}
export function drawPitchBackgrounds(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    view: Pick<PianoRollView, 'rowHeight' | 'highestVisiblePitch'>,
): void {
    if (width <= 0 || height <= 0) return;
    const rows = Math.min(
        Math.ceil(height / view.rowHeight),
        view.highestVisiblePitch + 1,
    );
    context.fillStyle = PIANO_ROLL_COLORS.blackKeyRow;
    for (let row = 0; row < rows; row++) {
        if (!isBlackKey(view.highestVisiblePitch - row)) continue;
        const y = row * view.rowHeight;
        context.fillRect(0, y, width, Math.min(view.rowHeight, height - y));
    }
}
