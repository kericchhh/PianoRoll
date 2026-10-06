import type { Note, PianoRollView } from '@/features/piano-roll/types';
import { tickToPixel } from '../utils/tickToPixel';
import { pitchToPixel } from '../utils/pitchtoPixel';
import { PIANO_ROLL_COLORS } from './colors';

export function drawNote(
    context: CanvasRenderingContext2D,
    note: Pick<Note, 'pitch' | 'startTick' | 'durationTicks' | 'selected'>,
    view: PianoRollView,
    fillStyle: string = note.selected
        ? PIANO_ROLL_COLORS.selectedNote
        : PIANO_ROLL_COLORS.note,
): void {
    const x = tickToPixel(
        note.startTick,
        view.pixelsPerTick,
        view.scrollOffsetX,
    );
    const y = pitchToPixel(
        note.pitch,
        view.highestVisiblePitch,
        view.rowHeight,
    );
    const width = note.durationTicks * view.pixelsPerTick;

    context.fillStyle = fillStyle;
    context.fillRect(x, y, width, view.rowHeight);

    if (fillStyle !== PIANO_ROLL_COLORS.ghost) {
        context.strokeStyle = note.selected
            ? PIANO_ROLL_COLORS.selectedOutline
            : PIANO_ROLL_COLORS.noteOutline;
        const strokeWidth = Math.min(
            note.selected ? 2 : 1,
            width / 2,
            view.rowHeight / 2,
        );
        context.lineWidth = strokeWidth;
        context.strokeRect(
            x + strokeWidth / 2,
            y + strokeWidth / 2,
            Math.max(0, width - strokeWidth),
            view.rowHeight - strokeWidth,
        );
    }
}
