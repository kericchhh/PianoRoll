import type { MouseEvent } from "react"
import type { PianoRollView } from "../types"
import { pixelToPitch } from "./pixelToPitch"
import { pixelToTick } from "./pixelToTick"

export function eventToMusicPoint(event: MouseEvent<HTMLCanvasElement>, width: number, height: number, view: PianoRollView) {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    const x = event.clientX - bounds.left - canvas.clientLeft
    const y = event.clientY - bounds.top - canvas.clientTop
    if (
        x < 0 || x >= canvas.clientWidth || 
        y < 0 || y >= canvas.clientHeight
    ) return
    const logicalX = x * width / canvas.clientWidth
    const logicalY = y * height / canvas.clientHeight
    const tick = pixelToTick(logicalX, view.pixelsPerTick, view.scrollOffsetX)
    const pitch = pixelToPitch(logicalY, view.highestVisiblePitch, view.rowHeight)
    return { tick: tick, pitch: pitch}
}
