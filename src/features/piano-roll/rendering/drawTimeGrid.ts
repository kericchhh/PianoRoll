import { drawTimeLine } from './drawTimeLine';
import { tickToPixel } from '../utils/tickToPixel';
import { GRID_STEPS } from '../constants';

export function drawTimeGrid(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    pixelsPerTick: number,
    scrollOffsetX: number,
    endTick: number,
): void {
    const minimumSpacing = 12;
    const stepTicks =
        GRID_STEPS.find((step) => step * pixelsPerTick >= minimumSpacing) ??
        GRID_STEPS[GRID_STEPS.length - 1];
    const leftTick = Math.max(0, scrollOffsetX / pixelsPerTick);
    const rightTick = Math.min(
        endTick,
        (scrollOffsetX + width) / pixelsPerTick,
    );
    const firstTick = Math.ceil(leftTick / stepTicks) * stepTicks;

    for (let tick = firstTick; tick <= rightTick; tick += stepTicks) {
        const x = tickToPixel(tick, pixelsPerTick, scrollOffsetX);
        drawTimeLine(context, x, height);
    }
}
