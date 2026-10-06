import type {
    MarqueeRect,
    Note,
    PianoRollView,
} from '@/features/piano-roll/types';
import {
    queryNoteIndex,
    type NoteIndex,
} from '@/features/piano-roll/utils/notes/noteIndex';
import { drawTimeGrid } from '@/features/piano-roll/rendering/grid/drawTimeGrid';
import {
    drawPitchBackgrounds,
    drawPitchRows,
} from '@/features/piano-roll/rendering/grid/drawPitchRows';
import { drawNote } from '@/features/piano-roll/rendering/notes/drawNote';
import { drawMarquee } from '@/features/piano-roll/rendering/notes/drawMarquee';
import { PIANO_ROLL_COLORS } from '@/features/piano-roll/rendering/colors';

type Scene = {
    index: NoteIndex;
    view: PianoRollView;
    width: number;
    height: number;
    endTick: number;
    previews: Record<string, Note> | null;
    marquee: MarqueeRect | null;
};

export function drawPianoRoll(context: CanvasRenderingContext2D, scene: Scene) {
    const { index, view, width, height, endTick, previews, marquee } = scene;
    context.clearRect(0, 0, width, height);
    const gridWidth = Math.max(
        0,
        Math.min(width, endTick * view.pixelsPerTick - view.scrollOffsetX),
    );
    drawPitchBackgrounds(context, gridWidth, height, view);
    drawTimeGrid(
        context,
        width,
        height,
        view.pixelsPerTick,
        view.scrollOffsetX,
        endTick,
    );
    drawPitchRows(context, gridWidth, height, view.rowHeight);
    const region = {
        startTick: view.scrollOffsetX / view.pixelsPerTick,
        endTick: Math.min(
            endTick,
            (view.scrollOffsetX + width) / view.pixelsPerTick,
        ),
        lowestPitch:
            view.highestVisiblePitch - Math.ceil(height / view.rowHeight) + 1,
        highestPitch: view.highestVisiblePitch,
    };
    const visible = (note: Note) =>
        note.startTick < region.endTick &&
        note.startTick + note.durationTicks > region.startTick &&
        note.pitch >= region.lowestPitch &&
        note.pitch <= region.highestPitch;
    const displayed = new Map(
        queryNoteIndex(index, region).map((note) => [note.id, note]),
    );
    if (previews) {
        for (const [id, preview] of Object.entries(previews)) {
            const origin = index.notes[id];
            if (origin && visible(origin))
                drawNote(
                    context,
                    { ...origin, selected: false },
                    view,
                    PIANO_ROLL_COLORS.ghost,
                );
            if (origin && visible(preview)) displayed.set(id, preview);
            else displayed.delete(id);
        }
    }
    const ordered = [...displayed.values()].sort(
        (a, b) => index.order.get(a.id)! - index.order.get(b.id)!,
    );
    for (const note of ordered) drawNote(context, note, view);
    if (marquee) drawMarquee(context, marquee);
}
