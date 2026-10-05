import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type {
    MarqueeRect,
    Note,
    PianoRollView,
} from '@/features/piano-roll/types';
import type { NoteIndex } from '@/features/piano-roll/utils/noteIndex';
import { drawPianoRoll } from '@/features/piano-roll/rendering/drawPianoRoll';
import { tickToPixel } from '@/features/piano-roll/utils/tickToPixel';
import { pitchToPixel } from '@/features/piano-roll/utils/pitchtoPixel';
import { drawTimeRuler } from '@/features/piano-roll/rendering/drawTimeRuler';
import { RULER_HEIGHT } from '@/features/piano-roll/constants';

type Options = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    rulerRef?: RefObject<HTMLCanvasElement | null>;
    overlayRef: RefObject<HTMLDivElement | null>;
    activeNoteRef: RefObject<string | null>;
    previewRef: RefObject<Record<string, Note> | null>;
    marqueeRef: RefObject<MarqueeRect | null>;
    index: NoteIndex;
    getView: () => PianoRollView;
    width: number;
    height: number;
    endTick: number;
};

export function useCanvasRenderer(options: Options) {
    const frameRef = useRef<number | null>(null);
    const drawRef = useRef<(() => void) | null>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const rulerContextRef = useRef<CanvasRenderingContext2D | null>(null);
    const rulerViewRef = useRef<string | null>(null);
    const {
        canvasRef,
        rulerRef,
        overlayRef,
        activeNoteRef,
        previewRef,
        marqueeRef,
        index,
        getView,
        width,
        height,
        endTick,
    } = options;
    const requestRedraw = useCallback(() => {
        if (frameRef.current !== null) return;
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            drawRef.current?.();
        });
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        contextRef.current = context;
        const rulerContext = rulerRef?.current?.getContext('2d') ?? null;
        rulerContextRef.current = rulerContext;
        const sizeCanvas = () => {
            const ratio = window.devicePixelRatio || 1;
            const pixelWidth = Math.round(width * ratio),
                pixelHeight = Math.round(height * ratio);
            if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
            if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            context?.setTransform(ratio, 0, 0, ratio, 0, 0);
            if (rulerRef && rulerRef.current) {
                const ruler = rulerRef.current;
                ruler.width = pixelWidth;
                ruler.height = Math.round(RULER_HEIGHT * ratio);
                ruler.style.width = `${width}px`;
                ruler.style.height = `${RULER_HEIGHT}px`;
                rulerContext?.setTransform(ratio, 0, 0, ratio, 0, 0);
                rulerViewRef.current = null;
            }
            requestRedraw();
        };
        sizeCanvas();
        window.addEventListener('resize', sizeCanvas);
        return () => {
            window.removeEventListener('resize', sizeCanvas);
            if (frameRef.current !== null)
                cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            drawRef.current = null;
            contextRef.current = null;
            rulerContextRef.current = null;
            rulerViewRef.current = null;
        };
    }, [canvasRef, rulerRef, height, requestRedraw, width]);

    useEffect(() => {
        const draw = () => {
            const view = getView();
            const previews = previewRef.current;
            const rulerView = `${view.pixelsPerTick}:${view.scrollOffsetX}:${width}:${endTick}`;
            if (rulerContextRef.current && rulerViewRef.current !== rulerView) {
                drawTimeRuler(
                    rulerContextRef.current,
                    width,
                    RULER_HEIGHT,
                    view,
                    endTick,
                );
                rulerViewRef.current = rulerView;
            }
            if (contextRef.current)
                drawPianoRoll(contextRef.current, {
                    index,
                    view,
                    width,
                    height,
                    endTick,
                    previews,
                    marquee: marqueeRef.current,
                });
            const overlay = overlayRef.current;
            const canvas = canvasRef.current;
            const origin =
                index.notes[activeNoteRef.current ?? ''] ?? index.selected[0];
            const note = origin && (previews?.[origin.id] ?? origin);
            if (!overlay || !canvas || !note) return;
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
            const left = Math.max(0, x),
                right = Math.min(
                    width,
                    x + note.durationTicks * view.pixelsPerTick,
                );
            overlay.style.display =
                right > left && y >= 0 && y < height ? 'block' : 'none';
            overlay.style.left = `${(left * canvas.clientWidth) / width + canvas.clientLeft}px`;
            overlay.style.top = `${(y * canvas.clientHeight) / height + canvas.clientTop}px`;
            overlay.style.width = `${(Math.max(0, right - left) * canvas.clientWidth) / width}px`;
            overlay.style.height = `${(view.rowHeight * canvas.clientHeight) / height}px`;
        };
        drawRef.current = draw;
        draw();
    }, [
        activeNoteRef,
        canvasRef,
        endTick,
        getView,
        height,
        index,
        marqueeRef,
        overlayRef,
        previewRef,
        width,
    ]);
    return requestRedraw;
}
