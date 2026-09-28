import { useRef, useEffect, useState } from "react";
import { drawTimeGrid } from "@/features/piano-roll/utils/drawTimeGrid";
import { drawPitchRows } from "@/features/piano-roll/utils/drawPitchRows";
import { drawNote } from "@/features/piano-roll/utils/drawNote";
import { useDrag, useWheel } from "@use-gesture/react";
import { scrollAfterZoom } from "@/features/piano-roll/utils/scrollAfterZoom";
import { clampScroll } from "@/features/piano-roll/utils/clampScroll";
import { clampScale } from "@/features/piano-roll/utils/clampScale";

export function PianoRollCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scaleRef = useRef(0.5);
    const frameRef = useRef<number | null>(null);
    const redrawRef = useRef<(() => void) | null>(null);
    const scrollRef = useRef(0);
    const [barCount, setBarCount] = useState(8);
    const ppq = 480;
    const beatsPerBar = 4;
    const endTick = barCount * beatsPerBar * ppq;
    const width = 600;

    function requestRedraw(): void {
        if (frameRef.current !== null) return;

        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null
            redrawRef.current?.()
        })
    }

    useWheel(
        ({ event, delta: [, deltaY], last }) => {
            if (!event.ctrlKey || last) return
            event.preventDefault()
            const canvas = canvasRef.current
            if (!canvas) return

            const cursorX = event.clientX - canvas.getBoundingClientRect().left - canvas.clientLeft
            const factor = Math.exp(-deltaY * 0.002)
            const nextScale = clampScale(scaleRef.current * factor, endTick, width)

            const proposedScroll = scrollAfterZoom(cursorX, scrollRef.current, scaleRef.current, nextScale)
            scrollRef.current = clampScroll(proposedScroll, endTick, nextScale, width)
            scaleRef.current = nextScale

            requestRedraw()
        },
        {
            target: canvasRef,
            eventOptions: { passive: false }
        }
    );

    useDrag(
        ({ event, delta: [deltaX] }) => {
            if (!event.shiftKey) return;
            event.preventDefault()

            scrollRef.current = clampScroll(
                scrollRef.current - deltaX,
                endTick,
                scaleRef.current,
                width
            );

            requestRedraw()
        },
        {
            target: canvasRef,
            pointer: { buttons: 1, keys: false },
            eventOptions: { passive: false }
        }
    );

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const height = 240
        const ratio = window.devicePixelRatio || 1

        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`

        const context = canvas.getContext('2d')
        if (!context) return

        context.setTransform(ratio, 0, 0, ratio, 0, 0)
        const redraw = () => {
            context.clearRect(0, 0, width, height)
            const timelineRight = endTick * scaleRef.current - scrollRef.current
            const gridWidth = Math.max(0, Math.min(width, timelineRight))
            drawTimeGrid(context, width, height, scaleRef.current, scrollRef.current, endTick)
            drawPitchRows(context, gridWidth, height, 20)
            drawNote(
                context,
                { pitch: 71, startTick: 480, durationTicks: 240 },
                {
                    pixelsPerTick: scaleRef.current,
                    scrollOffsetX: scrollRef.current,
                    highestVisiblePitch: 72,
                    rowHeight: 20
                }
            )
        }
        scaleRef.current = clampScale(scaleRef.current, endTick, width)
        scrollRef.current = clampScroll( scrollRef.current, endTick, scaleRef.current, width) 
        redrawRef.current = redraw
        redraw()

        return () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current)
                frameRef.current = null
            }

            redrawRef.current = null
        }
    }, [endTick]);

    return (
        <>
            <label>
                Timeline length  
                <select
                    value={barCount} 
                    onChange={event => setBarCount(Number(event.target.value))}
                    className="ml-2 border focus-visible:outline-2"
                >
                    {[4, 8, 16, 32].map(bars => (
                        <option key={bars} value={bars}>
                            {bars} bars
                        </option>
                    ))}
                </select>
            </label>
            <canvas
                ref={canvasRef}
                role="img"
                aria-label="Time grid preview"
                className="block border border-slate-600 select-none"
            />
        </>
    );
}
