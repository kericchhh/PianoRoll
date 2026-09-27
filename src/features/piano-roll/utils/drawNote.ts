import type { Note, PianoRollView } from "@/features/piano-roll/types";
import { tickToPixel } from "./tickToPixel";
import { pitchToPixel } from "./pitchtoPixel";

export function drawNote(
    context: CanvasRenderingContext2D,
    note: Pick<Note, 'pitch' | 'startTick' | 'durationTicks'>,
    view: PianoRollView
): void {
    const x = tickToPixel(note.startTick, view.pixelsPerTick, view.scrollOffsetX)
    const y = pitchToPixel(note.pitch, view.highestVisiblePitch, view.rowHeight)
    const width = note.durationTicks * view.pixelsPerTick

    context.fillStyle = '#2563eb'
    context.fillRect(x, y, width, view.rowHeight)
};
