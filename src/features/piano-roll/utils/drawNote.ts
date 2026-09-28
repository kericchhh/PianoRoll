import type { Note, PianoRollView } from "@/features/piano-roll/types";
import { tickToPixel } from "./tickToPixel";
import { pitchToPixel } from "./pitchtoPixel";

export function drawNote(
    context: CanvasRenderingContext2D,
    note: Pick<Note, 'pitch' | 'startTick' | 'durationTicks' | 'selected'>,
    view: PianoRollView
): void {
    const x = tickToPixel(note.startTick, view.pixelsPerTick, view.scrollOffsetX)
    const y = pitchToPixel(note.pitch, view.highestVisiblePitch, view.rowHeight)
    const width = note.durationTicks * view.pixelsPerTick

    context.fillStyle = '#2563eb'
    context.fillRect(x, y, width, view.rowHeight)

    if (note.selected){
        context.strokeStyle = '#ffffff'
        context.lineWidth = 2
        context.strokeRect(x + 1, y + 1, width - 2, view.rowHeight - 2)
    }
};
