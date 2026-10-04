export function drawTimeLine(
  context: CanvasRenderingContext2D,
  x: number,
  height: number,
): void {
  context.lineWidth = 1;
  context.strokeStyle = PIANO_ROLL_COLORS.timeGrid;
  context.beginPath();
  context.moveTo(x, 0);
  context.lineTo(x, height);
  context.stroke();
}
import { PIANO_ROLL_COLORS } from './colors';
