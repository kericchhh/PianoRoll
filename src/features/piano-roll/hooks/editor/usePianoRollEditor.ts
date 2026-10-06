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

export function usePianoRollEditor(
    endTick: number,
    onTogglePlayback?: () => void,
) {
    const viewport = usePianoRollViewport(endTick);
    const { width, height, getView, reveal, clamp, scaleRef, scrollRef } =
        viewport;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rulerRef = useRef<HTMLCanvasElement>(null);
    const surfaceRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const playheadDrawRef = useRef<(() => void) | null>(null);
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

    const requestRedraw = useCanvasRenderer({
        canvasRef,
        rulerRef,
        overlayRef,
        playheadDrawRef,
        activeNoteRef,
        previewRef,
        marqueeRef,
        index,
        getView,
        width,
        height,
        endTick,
    });
    const onReveal = useCallback(
        (moved: readonly Note[]) => {
            reveal(moved);
            requestRedraw();
        },
        [reveal, requestRedraw],
    );
    const interactions = useNoteInteractions({
        canvasRef,
        getView,
        width,
        height,
        endTick,
        dragCandidateRef,
        previewRef,
        marqueeRef,
        requestRedraw,
        onReveal,
        queryNotes,
        surfaceRef,
        onTogglePlayback,
    });
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
        endTick,
        requestRedraw,
        playheadDrawRef,
        viewport,
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
