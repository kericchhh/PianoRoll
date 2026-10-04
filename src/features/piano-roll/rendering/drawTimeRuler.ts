import { BEATS_PER_BAR, PPQ } from '../constants';
import type { PianoRollView } from '../types';
import { tickToPixel } from '../utils/tickToPixel';
import { PIANO_ROLL_COLORS } from './colors';

export function drawTimeRuler(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  view: PianoRollView,
  endTick: number,
) {
  context.clearRect(0, 0, width, height);
  const barTicks = PPQ * BEATS_PER_BAR;
  const stepBars = Math.max(1, Math.ceil(64 / (barTicks * view.pixelsPerTick)));
  const firstBar = Math.max(
    0,
    Math.ceil(view.scrollOffsetX / view.pixelsPerTick / barTicks / stepBars) *
      stepBars,
  );
  const lastTick = Math.min(
    endTick,
    (view.scrollOffsetX + width) / view.pixelsPerTick,
  );
  context.font = '12px Barlow, sans-serif';
  context.textBaseline = 'middle';
  context.fillStyle = PIANO_ROLL_COLORS.rulerText;
  context.strokeStyle = PIANO_ROLL_COLORS.timeGrid;
  context.lineWidth = 1;
  for (let bar = firstBar; bar * barTicks < lastTick; bar += stepBars) {
    const x = tickToPixel(
      bar * barTicks,
      view.pixelsPerTick,
      view.scrollOffsetX,
    );
    context.fillText(String(bar + 1), x + 8, height / 2);
    context.beginPath();
    context.moveTo(x, height - 5);
    context.lineTo(x, height);
    context.stroke();
  }
}
