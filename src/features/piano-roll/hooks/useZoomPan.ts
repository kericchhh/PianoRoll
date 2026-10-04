import { useDrag, useWheel } from '@use-gesture/react';
import { clampScale } from '@/features/piano-roll/utils/clampScale';
import { scrollAfterZoom } from '@/features/piano-roll/utils/scrollAfterZoom';
import { clampScroll } from '@/features/piano-roll/utils/clampScroll';
import type { RefObject } from 'react';
import type { GestureMode } from '@/features/piano-roll/types';
import { clientToCanvasPoint } from '@/features/piano-roll/utils/canvasCoordinates';
import { VIEWPORT_HEIGHT } from '@/features/piano-roll/constants';

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  scaleRef: RefObject<number>;
  scrollRef: RefObject<number>;
  endTick: number;
  width: number;
  height?: number;
  requestRedraw: () => void;
  gestureModeRef: RefObject<GestureMode>;
  dragScaleRef: RefObject<{ x: number; y: number }>;
  surfaceRef?: RefObject<HTMLDivElement | null>;
};

export function useZoomPan({
  canvasRef,
  scaleRef,
  scrollRef,
  endTick,
  width,
  height = VIEWPORT_HEIGHT,
  requestRedraw,
  gestureModeRef,
  dragScaleRef,
  surfaceRef,
}: Options) {
  useWheel(
    ({ event, delta: [, deltaY], last }) => {
      if (!event.ctrlKey || last) return;
      event.preventDefault();
      if (gestureModeRef.current !== 'idle') return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const point = clientToCanvasPoint(
        canvas,
        event.clientX,
        event.clientY,
        width,
        height,
      );
      if (!point) return;
      const cursorX = point.x;
      const factor = Math.exp(-deltaY * 0.002);
      const nextScale = clampScale(scaleRef.current * factor, endTick, width);

      const proposedScroll = scrollAfterZoom(
        cursorX,
        scrollRef.current,
        scaleRef.current,
        nextScale,
      );
      scrollRef.current = clampScroll(
        proposedScroll,
        endTick,
        nextScale,
        width,
      );
      scaleRef.current = nextScale;

      requestRedraw();
    },
    { target: surfaceRef ?? canvasRef, eventOptions: { passive: false } },
  );

  useDrag(
    ({ event, delta: [deltaX], last, tap, canceled }) => {
      if (gestureModeRef.current !== 'pan') return;
      if (tap || canceled || event.type === 'pointercancel') {
        gestureModeRef.current = 'idle';
        return;
      }
      event.preventDefault();

      scrollRef.current = clampScroll(
        scrollRef.current - deltaX * dragScaleRef.current.x,
        endTick,
        scaleRef.current,
        width,
      );
      requestRedraw();
      if (last) gestureModeRef.current = 'idle';
    },
    {
      target: surfaceRef ?? canvasRef,
      filterTaps: true,
      pointer: { buttons: 1, keys: false },
      eventOptions: { passive: false },
    },
  );
}
