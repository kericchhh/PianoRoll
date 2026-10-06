import { RULER_HEIGHT } from '@/features/piano-roll/constants';
import { PIANO_ROLL_COLORS } from '@/features/piano-roll/rendering/colors';

export function drawPlayhead(
    context: CanvasRenderingContext2D,
    x: number,
    width: number,
    height: number,
): void {
    context.clearRect(0, 0, width, height);
    if (!Number.isFinite(x) || x < 0 || x > width) return;
    const lineX = Math.max(1, Math.min(width - 1, x));
    context.beginPath();
    context.moveTo(lineX, RULER_HEIGHT);
    context.lineTo(lineX, height);
    context.strokeStyle = PIANO_ROLL_COLORS.selectedOutline;
    context.lineWidth = 3;
    context.stroke();
    context.strokeStyle = PIANO_ROLL_COLORS.playhead;
    context.lineWidth = 1;
    context.stroke();
    context.beginPath();
    context.moveTo(lineX - 5, RULER_HEIGHT - 9);
    context.lineTo(lineX + 5, RULER_HEIGHT - 9);
    context.lineTo(lineX, RULER_HEIGHT);
    context.closePath();
    context.fillStyle = PIANO_ROLL_COLORS.selectedNote;
    context.fill();
}
