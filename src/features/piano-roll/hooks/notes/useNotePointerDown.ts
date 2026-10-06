import type { PointerEvent, RefObject } from 'react';
import type { GestureMode, Note } from '@/features/piano-roll/types';
import type { NoteInteractionOptions } from '@/features/piano-roll/hooks/notes/noteInteractionTypes';
import { eventToMusicPoint } from '@/features/piano-roll/utils/coordinates/eventToMusicPoint';
import { getCanvasScale } from '@/features/piano-roll/utils/coordinates/canvasCoordinates';
import { isNoteResizeHandle } from '@/features/piano-roll/utils/notes/isNoteResizeHandle';
import { tickToPixel } from '@/features/piano-roll/utils/coordinates/tickToPixel';

type Options = Pick<
    NoteInteractionOptions,
    | 'canvasRef'
    | 'width'
    | 'height'
    | 'getView'
    | 'endTick'
    | 'dragCandidateRef'
    | 'previewRef'
    | 'requestRedraw'
> & {
    gestureModeRef: RefObject<GestureMode>;
    dragScaleRef: RefObject<{ x: number; y: number }>;
    dragNotesRef: RefObject<readonly Note[]>;
    suppressClickRef: RefObject<boolean>;
    noteAt: (tick: number, pitch: number) => Note | undefined;
    activateNote: (id: string) => void;
    resetMarquee: () => void;
    startMarquee: (x: number, y: number) => void;
};

export function useNotePointerDown({
    canvasRef,
    width,
    height,
    getView,
    endTick,
    dragCandidateRef,
    previewRef,
    requestRedraw,
    gestureModeRef,
    dragScaleRef,
    dragNotesRef,
    suppressClickRef,
    noteAt,
    activateNote,
    resetMarquee,
    startMarquee,
}: Options) {
    return function handleCanvasPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0) return;
        dragCandidateRef.current = null;
        dragNotesRef.current = [];
        suppressClickRef.current = false;
        gestureModeRef.current = 'idle';
        if (previewRef.current) {
            previewRef.current = null;
            requestRedraw();
        }
        resetMarquee();
        const canvas = canvasRef.current;
        if (canvas)
            dragScaleRef.current = getCanvasScale(canvas, width, height) ?? {
                x: 1,
                y: 1,
            };
        if (event.shiftKey) {
            gestureModeRef.current = 'pan';
            suppressClickRef.current = true;
            return;
        }
        const point = eventToMusicPoint(
            event,
            width,
            height,
            getView(),
            canvasRef.current ?? undefined,
        );
        if (!point) return;
        const match = noteAt(point.tick, point.pitch);
        if (match) activateNote(match.id);
        if (event.ctrlKey || event.metaKey) {
            gestureModeRef.current = 'select';
            if (!match && point.tick >= 0 && point.tick < endTick) {
                gestureModeRef.current = 'marquee';
                startMarquee(point.x, point.y);
            }
            return;
        }
        dragCandidateRef.current = match ?? null;
        if (!match) {
            gestureModeRef.current = 'select';
            return;
        }
        const view = getView();
        const endpointX = tickToPixel(
            match.startTick + match.durationTicks,
            view.pixelsPerTick,
            view.scrollOffsetX,
        );
        gestureModeRef.current =
            endpointX > 0 &&
            endpointX <= width &&
            isNoteResizeHandle(
                match,
                point.tick,
                view.pixelsPerTick,
                dragScaleRef.current.x,
            )
                ? 'resize'
                : 'move';
    };
}
