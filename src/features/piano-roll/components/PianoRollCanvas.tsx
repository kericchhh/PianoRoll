import { useRef, useEffect } from "react";
import { drawTimeGrid } from "@/features/piano-roll/utils/drawTimeGrid";
import { drawPitchRows } from "@/features/piano-roll/utils/drawPitchRows";
import { useWheel } from "@use-gesture/react";
import { scrollAfterZoom } from "../utils/scrollAfterZoom";

export function PianoRollCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scaleRef = useRef(0.5);
    const frameRef = useRef<number | null>(null);
    const redrawRef = useRef<(() => void) | null>(null);
    const scrollRef = useRef(0);

    useWheel(
        ({ event, delta: [, deltaY], last }) => {
            if (!event.ctrlKey || last) return
            event.preventDefault()
            const canvas = canvasRef.current
            if (!canvas) return

            const cursorX = event.clientX - canvas.getBoundingClientRect().left - canvas.clientLeft
            const factor = Math.exp(-deltaY * 0.002)
            const nextScale = Math.min(2, Math.max(0.0625, scaleRef.current * factor))

            scrollRef.current = scrollAfterZoom(cursorX, scrollRef.current, scaleRef.current, nextScale)
            scaleRef.current = nextScale
            
            if (frameRef.current === null) {
                frameRef.current = requestAnimationFrame(() => {
                    frameRef.current = null;
                    redrawRef.current?.()
                })
            }
        },
        {
            target: canvasRef,
            eventOptions: { passive: false }
        }
    );

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        
        const width = 600
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
            drawTimeGrid(context, width, height, scaleRef.current, scrollRef.current)
            drawPitchRows(context, width, height, 20)
        } 

        redrawRef.current = redraw
        redraw()

        return () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current)
                frameRef.current = null
            }

            redrawRef.current = null
        }
    }, []);

    return (
        <canvas
        ref={canvasRef}
        role="img"
        aria-label="Time grid preview"
        className="block border border-slate-600"
        />
    );
}
