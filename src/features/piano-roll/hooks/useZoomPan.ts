import { useDrag, useWheel } from "@use-gesture/react";
import { clampScale } from "@/features/piano-roll/utils/clampScale";
import { scrollAfterZoom } from "@/features/piano-roll/utils/scrollAfterZoom";
import { clampScroll } from "@/features/piano-roll/utils/clampScroll";
import type { RefObject } from "react";

type Options = {
    canvasRef: RefObject<HTMLCanvasElement | null>,
    scaleRef: RefObject<number>,
    scrollRef: RefObject<number>,
    endTick: number,
    width: number,
    requestRedraw: () => void
};

export function useZoomPan({
    canvasRef,
    scaleRef,
    scrollRef,
    endTick,
    width,
    requestRedraw
}: Options) {
    useWheel(
        ({ event, delta: [, deltaY], last }) => {
            if (!event.ctrlKey || last) return;
            event.preventDefault();
            const canvas = canvasRef.current;
            if (!canvas) return;
            const cursorX = event.clientX - canvas.getBoundingClientRect().left - canvas.clientLeft
            const factor = Math.exp(-deltaY * 0.002)
            const nextScale = clampScale(scaleRef.current * factor, endTick, width)

            const proposedScroll = scrollAfterZoom(cursorX, scrollRef.current, scaleRef.current, nextScale)
            scrollRef.current = clampScroll(proposedScroll, endTick, nextScale, width)
            scaleRef.current = nextScale

            requestRedraw()
        },
        { target: canvasRef, eventOptions: { passive: false } },
    );

    useDrag(
        ({ event, delta: [deltaX] }) => {
            if (!event.shiftKey) return;
            event.preventDefault()

            scrollRef.current = clampScroll(
                scrollRef.current - deltaX, endTick, scaleRef.current, width
            )
            requestRedraw()
        },
        {
            target: canvasRef, pointer: { buttons: 1, keys: false }, eventOptions: { passive: false}
        }
    );
}
