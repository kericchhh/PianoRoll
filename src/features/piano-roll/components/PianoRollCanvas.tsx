import { useRef, useEffect } from "react";
import { drawTimeGrid } from "@/features/piano-roll/utils/drawTimeGrid";
import { drawPitchRows } from "@/features/piano-roll/utils/drawPitchRows";

export function PianoRollCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
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
        context.clearRect(0, 0, width, height)
        drawTimeGrid(context, width, height, 0.5, 0)
        drawPitchRows(context, width, height, 20)
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
