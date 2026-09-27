import { drawTimeLine } from "./drawTimeLine"
import { tickToPixel } from "./tickToPixel"

export function drawTimeGrid(
    context: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    pixelsPerTick: number, 
    scrollOffsetX: number
): void {
   const stepTicks = 120
   const leftTick = scrollOffsetX / pixelsPerTick
   const rightTick = (scrollOffsetX + width) / pixelsPerTick
   const firstTick = Math.ceil(leftTick / stepTicks) * stepTicks

   for (let tick = firstTick; tick <= rightTick; tick += stepTicks) {
       const x = tickToPixel(tick, pixelsPerTick, scrollOffsetX);
       drawTimeLine(context, x, height);
   }
}
