import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { GestureMode, Note } from '@/features/piano-roll/types';
import type { NoteInteractionOptions } from './noteInteractionTypes';
import {
    clientToCanvasPoint,
    getCanvasScale,
} from '@/features/piano-roll/utils/coordinates/canvasCoordinates';
import { pixelToTick } from '@/features/piano-roll/utils/coordinates/pixelToTick';
import { pixelToPitch } from '@/features/piano-roll/utils/coordinates/pixelToPitch';
import { getNoteEditMode } from '@/features/piano-roll/utils/notes/getNoteEditMode';
import {
    getInteractionCursor,
    type EditorCursor,
} from '@/features/piano-roll/utils/notes/getInteractionCursor';

type Pointer = Pick<
    globalThis.PointerEvent,
    'clientX' | 'clientY' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'pointerType'
>;
type Options = Pick<
    NoteInteractionOptions,
    'canvasRef' | 'surfaceRef' | 'getView' | 'width' | 'height' | 'endTick'
> & {
    gestureModeRef: RefObject<GestureMode>;
    noteAt: (tick: number, pitch: number) => Note | undefined;
};
const snapshot = (event: Pointer): Pointer => ({
    clientX: event.clientX,
    clientY: event.clientY,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    pointerType: event.pointerType,
});

export function useNoteCursor({
    canvasRef,
    surfaceRef,
    getView,
    width,
    height,
    endTick,
    gestureModeRef,
    noteAt,
}: Options) {
    const pointerRef = useRef<Pointer | null>(null);
    const pressedRef = useRef(false);
    const selectionCursorRef = useRef<EditorCursor>('crosshair');
    const frameRef = useRef<number | null>(null);
    const paintRef = useRef<(() => void) | null>(null);
    const refreshCursor = useCallback(() => paintRef.current?.(), []);
    const schedule = useCallback(() => {
        if (frameRef.current !== null) return;
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            refreshCursor();
        });
    }, [refreshCursor]);
    function cursorAt(
        pointer: Pointer | null,
        mode: GestureMode,
    ): EditorCursor {
        const canvas = canvasRef.current;
        if (!canvas || !pointer || pointer.pointerType === 'touch')
            return 'default';
        if (mode !== 'idle')
            return getInteractionCursor({
                mode,
                target: 'outside',
                ...pointer,
                selectionCursor: selectionCursorRef.current,
            });
        const point = clientToCanvasPoint(
            canvas,
            pointer.clientX,
            pointer.clientY,
            width,
            height,
        );
        if (
            !point ||
            point.x < 0 ||
            point.x >= width ||
            point.y < 0 ||
            point.y >= height
        )
            return 'default';
        const view = getView();
        const tick = pixelToTick(
            point.x,
            view.pixelsPerTick,
            view.scrollOffsetX,
        );
        const pitch = pixelToPitch(
            point.y,
            view.highestVisiblePitch,
            view.rowHeight,
        );
        const note = noteAt(tick, pitch);
        const target = note
            ? getNoteEditMode(
                  note,
                  tick,
                  view,
                  width,
                  getCanvasScale(canvas, width, height)?.x,
              )
            : tick >= 0 && tick < endTick && pitch >= 0 && pitch <= 127
              ? 'empty'
              : 'outside';
        return getInteractionCursor({ mode, target, ...pointer });
    }

    useEffect(() => {
        paintRef.current = () => {
            const surface = surfaceRef?.current ?? canvasRef.current;
            if (!surface) return;
            const cursor = cursorAt(
                pointerRef.current,
                pressedRef.current ? gestureModeRef.current : 'idle',
            );
            if (surface.style.cursor !== cursor) surface.style.cursor = cursor;
        };
        refreshCursor();
    });
    useEffect(() => {
        const surface = surfaceRef?.current ?? canvasRef.current;
        function clear() {
            pointerRef.current = null;
            pressedRef.current = false;
            refreshCursor();
        }
        function modifiers(event: KeyboardEvent) {
            if (
                !pointerRef.current ||
                !['Shift', 'Control', 'Meta'].includes(event.key)
            )
                return;
            pointerRef.current = {
                ...pointerRef.current,
                shiftKey: event.shiftKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
            };
            schedule();
        }
        function release(event: globalThis.PointerEvent) {
            if (!pressedRef.current) return;
            pressedRef.current = false;
            pointerRef.current =
                event.type === 'pointercancel' ? null : snapshot(event);
            schedule();
        }
        window.addEventListener('keydown', modifiers);
        window.addEventListener('keyup', modifiers);
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
        window.addEventListener('lostpointercapture', release);
        window.addEventListener('blur', clear);
        window.addEventListener('contextmenu', clear);
        return () => {
            window.removeEventListener('keydown', modifiers);
            window.removeEventListener('keyup', modifiers);
            window.removeEventListener('pointerup', release);
            window.removeEventListener('pointercancel', release);
            window.removeEventListener('lostpointercapture', release);
            window.removeEventListener('blur', clear);
            window.removeEventListener('contextmenu', clear);
            if (frameRef.current !== null)
                cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            paintRef.current = null;
            if (surface) surface.style.cursor = '';
        };
    }, [canvasRef, surfaceRef, refreshCursor, schedule]);

    function track(event: Pointer) {
        if (event.pointerType === 'touch') return;
        pointerRef.current = snapshot(event);
        schedule();
    }
    return {
        refreshCursor,
        handlePointerDown(event: Pointer & { button: number }) {
            if (event.button !== 0 || event.pointerType === 'touch') return;
            pointerRef.current = snapshot(event);
            selectionCursorRef.current = cursorAt(pointerRef.current, 'idle');
            pressedRef.current = true;
            schedule();
        },
        handlers: {
            onPointerEnter: track,
            onPointerMove: track,
            onPointerLeave() {
                if (!pressedRef.current) pointerRef.current = null;
                schedule();
            },
        },
    };
}
