import type { Note, PianoRollView } from '@/features/piano-roll/types';
import { tickToPixel } from '@/features/piano-roll/utils/coordinates/tickToPixel';
import { isNoteResizeHandle } from './isNoteResizeHandle';

export function getNoteEditMode(
    note: Pick<Note, 'startTick' | 'durationTicks'>,
    tick: number,
    view: PianoRollView,
    width: number,
    canvasScaleX = 1,
): 'move' | 'resize' {
    const endpointX = tickToPixel(
        note.startTick + note.durationTicks,
        view.pixelsPerTick,
        view.scrollOffsetX,
    );
    return endpointX > 0 &&
        endpointX <= width &&
        isNoteResizeHandle(note, tick, view.pixelsPerTick, canvasScaleX)
        ? 'resize'
        : 'move';
}
