import { useRef, type RefObject } from 'react';
import type {
    MarqueeRect,
    PianoRollView,
    NoteRegion,
    Note,
} from '@/features/piano-roll/types';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { findNotesInRegion } from '@/features/piano-roll/utils/notes/findNotesInRegion';
import { marqueeToRegion } from '@/features/piano-roll/utils/coordinates/marqueeToRegion';
import { tickToPixel } from '@/features/piano-roll/utils/coordinates/tickToPixel';
import { getCanvasScale } from '@/features/piano-roll/utils/coordinates/canvasCoordinates';

type Options = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    marqueeRef: RefObject<MarqueeRect | null>;
    width: number;
    height: number;
    endTick: number;
    getView: () => PianoRollView;
    requestRedraw: () => void;
    onSelectionChange: () => void;
    queryNotes?: (region: NoteRegion) => Note[];
};

type DragUpdate = {
    dx: number;
    dy: number;
    last: boolean;
    tap: boolean;
    canceled: boolean;
};

export function useMarqueeSelection({
    canvasRef,
    marqueeRef,
    width,
    height,
    endTick,
    getView,
    requestRedraw,
    onSelectionChange,
    queryNotes,
}: Options) {
    const anchorRef = useRef<{
        x: number;
        y: number;
        scaleX: number;
        scaleY: number;
    } | null>(null);

    function resetMarquee() {
        const hadPreview = marqueeRef.current !== null;
        anchorRef.current = null;
        marqueeRef.current = null;
        if (hadPreview) requestRedraw();
    }

    function startMarquee(x: number, y: number) {
        const canvas = canvasRef.current;
        const scale = canvas && getCanvasScale(canvas, width, height);
        if (!scale) return;
        anchorRef.current = {
            x,
            y,
            scaleX: scale.x,
            scaleY: scale.y,
        };
    }

    function updateMarquee({
        dx,
        dy,
        last,
        tap,
        canceled,
    }: DragUpdate): boolean {
        const anchor = anchorRef.current;
        if (!anchor) return false;
        if (tap || canceled) {
            resetMarquee();
            return true;
        }

        const view = getView();
        const rightEdge = Math.max(
            0,
            Math.min(
                width,
                tickToPixel(endTick, view.pixelsPerTick, view.scrollOffsetX),
            ),
        );
        const rect: MarqueeRect = {
            startX: anchor.x,
            startY: anchor.y,
            endX: Math.max(
                0,
                Math.min(rightEdge, anchor.x + dx * anchor.scaleX),
            ),
            endY: Math.max(0, Math.min(height, anchor.y + dy * anchor.scaleY)),
        };
        marqueeRef.current = rect;

        if (last) {
            const region = marqueeToRegion(rect, view);
            const store = useNoteStore.getState();
            store.selectNotes(
                region
                    ? queryNotes
                        ? queryNotes(region).map((note) => note.id)
                        : findNotesInRegion(store.notes, region)
                    : [],
            );
            anchorRef.current = null;
            marqueeRef.current = null;
            onSelectionChange();
        }
        requestRedraw();
        return true;
    }

    return { startMarquee, updateMarquee, resetMarquee };
}
