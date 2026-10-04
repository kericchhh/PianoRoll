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
import { PIANO_ROLL_COLORS } from './colors';
