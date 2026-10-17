import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
    MarqueeRect,
    Note,
    NoteRegion,
} from '@/features/piano-roll/types';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import {
    createNoteIndex,
    queryNoteIndex,
} from '@/features/piano-roll/utils/notes/noteIndex';
import { useCanvasRenderer } from '@/features/piano-roll/hooks/editor/useCanvasRenderer';
import { useNoteInteractions } from '@/features/piano-roll/hooks/notes/useNoteInteractions';
import { usePianoRollViewport } from '@/features/piano-roll/hooks/editor/usePianoRollViewport';
import { useZoomPan } from '@/features/piano-roll/hooks/editor/useZoomPan';
import { useViewportActions } from '@/features/piano-roll/hooks/editor/useViewportActions';
import {
    DEFAULT_SNAP_TICKS,
    type SnapTicks,
} from '@/features/piano-roll/constants/music';

export function usePianoRollEditor(
    endTick: number,
    onTogglePlayback?: () => void,
    snapTicks: SnapTicks = DEFAULT_SNAP_TICKS,
) {
    const viewport = usePianoRollViewport(endTick);
    const { width, height, getView, reveal, clamp, scaleRef, scrollRef } =
        viewport;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rulerRef = useRef<HTMLCanvasElement>(null);
    const surfaceRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const playheadDrawRef = useRef<(() => void) | null>(null);
    const velocityDrawRef = useRef<(() => void) | null>(null);
    const preserveViewOnStopRef = useRef(false);
    const cursorRefreshRef = useRef<(() => void) | null>(null);
    const setPreserveViewOnStop = useCallback((preserve: boolean) => {
        preserveViewOnStopRef.current = preserve;
    }, []);
    const activeNoteRef = useRef<string | null>(null);
    const dragCandidateRef = useRef<Note | null>(null);
    const previewRef = useRef<Record<string, Note> | null>(null);
    const marqueeRef = useRef<MarqueeRect | null>(null);
    const notes = useNoteStore((state) => state.notes);
    const index = useMemo(() => createNoteIndex(notes), [notes]);
    const queryNotes = useCallback(
        (region: NoteRegion) => queryNoteIndex(index, region),
        [index],
    );

    const redrawCanvas = useCanvasRenderer({
        editorRef: viewport.editorRef,
        canvasRef,
        rulerRef,
        overlayRef,
        playheadDrawRef,
        velocityDrawRef,
        activeNoteRef,
        previewRef,
        marqueeRef,
        index,
        getView,
        width,
        height,
        endTick,
        snapTicks,
    });
    const requestRedraw = useCallback(() => {
        redrawCanvas();
        cursorRefreshRef.current?.();
    }, [redrawCanvas]);
    const onReveal = useCallback(
        (moved: readonly Note[]) => {
            reveal(moved);
            requestRedraw();
        },
        [reveal, requestRedraw],
    );
    const interactions = useNoteInteractions({
        editorRef: viewport.editorRef,
        canvasRef,
        getView,
        width,
        height,
        endTick,
        snapTicks,
        dragCandidateRef,
        previewRef,
        marqueeRef,
        requestRedraw,
        onReveal,
        queryNotes,
        surfaceRef,
        onTogglePlayback,
    });
    const refreshCursor = interactions.cursor.refreshCursor;
    const viewportActions = useViewportActions({
        scaleRef,
        scrollRef,
        width,
        endTick,
        gestureModeRef: interactions.gestureModeRef,
        requestRedraw,
        announce: interactions.announce,
    });
    useEffect(() => {
        cursorRefreshRef.current = refreshCursor;
        return () => {
            cursorRefreshRef.current = null;
        };
    }, [refreshCursor]);
    useZoomPan({
        canvasRef,
        surfaceRef,
        scaleRef,
        scrollRef,
        endTick,
        width,
        height,
        requestRedraw,
        gestureModeRef: interactions.gestureModeRef,
        dragScaleRef: interactions.dragScaleRef,
    });

    const activeNote = interactions.activeNoteId
        ? notes[interactions.activeNoteId]
        : undefined;
    const selectedNote = activeNote?.selected ? activeNote : index.selected[0];
    useEffect(() => {
        activeNoteRef.current = selectedNote?.id ?? null;
        requestRedraw();
    }, [selectedNote, requestRedraw]);
    useEffect(() => {
        clamp();
        requestRedraw();
    }, [clamp, requestRedraw]);

    return {
        viewportActions,
        snapTicks,
        endTick,
        requestRedraw,
        playheadDrawRef,
        velocityDrawRef,
        queryNotes,
        viewport,
        preserveViewOnStopRef,
        setPreserveViewOnStop,
        canvasRef,
        rulerRef,
        surfaceRef,
        overlayRef,
        notes,
        selectedNote,
        interactions,
    };
}

export type PianoRollEditorModel = ReturnType<typeof usePianoRollEditor>;
