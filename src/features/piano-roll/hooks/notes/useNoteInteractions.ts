import { useRef, useState, type MouseEvent } from 'react';
import type { GestureMode, Note } from '@/features/piano-roll/types';
import type { NoteInteractionOptions } from '@/features/piano-roll/hooks/notes/noteInteractionTypes';
import { eventToMusicPoint } from '@/features/piano-roll/utils/coordinates/eventToMusicPoint';
import { findNoteAt } from '@/features/piano-roll/utils/notes/findNoteAt';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { useMarqueeSelection } from '@/features/piano-roll/hooks/notes/useMarqueeSelection';
import { useNoteActions } from '@/features/piano-roll/hooks/notes/useNoteActions';
import { useNoteKeyboard } from '@/features/piano-roll/hooks/notes/useNoteKeyboard';
import { useNoteDrag } from '@/features/piano-roll/hooks/notes/useNoteDrag';
import { useNotePointerDown } from '@/features/piano-roll/hooks/notes/useNotePointerDown';
import { useNoteHistory } from '@/features/piano-roll/hooks/notes/useNoteHistory';
import { useNoteCursor } from '@/features/piano-roll/hooks/notes/useNoteCursor';
import { useSelectionEdits } from '@/features/piano-roll/hooks/notes/useSelectionEdits';
import { DEFAULT_SNAP_TICKS } from '@/features/piano-roll/constants/music';

export function useNoteInteractions(options: NoteInteractionOptions) {
    const {
        canvasRef,
        width,
        height,
        getView,
        endTick,
        snapTicks = DEFAULT_SNAP_TICKS,
        marqueeRef,
        requestRedraw,
        queryNotes,
        onReveal,
        onTogglePlayback,
    } = options;
    const [menuNoteId, SetMenuNoteId] = useState<string | null>(null);
    const suppressClickRef = useRef(false);
    const dragNotesRef = useRef<readonly Note[]>([]);
    const gestureModeRef = useRef<GestureMode>('idle');
    const dragScaleRef = useRef({ x: 1, y: 1 });
    const {
        announce,
        announcement,
        activeNoteId,
        activateNote,
        selectNote,
        addNote,
        deleteNote,
        deleteNotes,
        copyNotes,
        pasteNotes,
        commitMove,
        commitResize,
        announceSelection,
    } = useNoteActions(endTick, onReveal, snapTicks);
    const history = useNoteHistory({
        gestureModeRef,
        editorRef: options.editorRef,
        activeNoteId,
        onActivate: activateNote,
        onReveal,
        announce,
    });
    const selectionEdits = useSelectionEdits({
        endTick,
        gestureModeRef,
        commitMove,
        commitResize,
    });
    const handleEditorKeyDown = useNoteKeyboard({
        snapTicks,
        undo: history.undo,
        redo: history.redo,
        ...selectionEdits,
        gestureModeRef,
        deleteNotes,
        copyNotes,
        pasteNotes,
        onTogglePlayback,
    });
    const { startMarquee, updateMarquee, resetMarquee } = useMarqueeSelection({
        canvasRef,
        marqueeRef,
        width,
        height,
        endTick,
        getView,
        requestRedraw,
        onSelectionChange: announceSelection,
        queryNotes,
    });

    function noteAt(tick: number, pitch: number) {
        const notes = queryNotes
            ? Object.fromEntries(
                  queryNotes({
                      startTick: tick,
                      endTick: tick + 1,
                      lowestPitch: pitch,
                      highestPitch: pitch,
                  }).map((note) => [note.id, note]),
              )
            : useNoteStore.getState().notes;
        return findNoteAt(notes, tick, pitch);
    }

    useNoteDrag({
        ...options,
        gestureModeRef,
        dragScaleRef,
        dragNotesRef,
        suppressClickRef,
        updateMarquee,
        commitMove,
        commitResize,
    });
    const handleCanvasPointerDown = useNotePointerDown({
        ...options,
        gestureModeRef,
        dragScaleRef,
        dragNotesRef,
        suppressClickRef,
        noteAt,
        activateNote,
        resetMarquee,
        startMarquee,
    });
    const cursor = useNoteCursor({ ...options, gestureModeRef, noteAt });

    function handleCanvasContextMenu(event: MouseEvent<HTMLElement>) {
        if (event.button !== 2) {
            const notes = useNoteStore.getState().notes;
            const active = activeNoteId && notes[activeNoteId];
            SetMenuNoteId(
                active && active.selected
                    ? active.id
                    : (Object.values(notes).find((note) => note.selected)?.id ??
                          null),
            );
            return;
        }
        const point = eventToMusicPoint(
            event,
            width,
            height,
            getView(),
            canvasRef.current ?? undefined,
        );
        const note = point ? noteAt(point.tick, point.pitch) : undefined;
        SetMenuNoteId(note?.id ?? null);
    }

    function handleCanvasClick(event: MouseEvent<HTMLElement>) {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        if (event.shiftKey) return;
        const point = eventToMusicPoint(
            event,
            width,
            height,
            getView(),
            canvasRef.current ?? undefined,
        );
        if (!point) return;
        const match = noteAt(point.tick, point.pitch);
        if (match) {
            selectNote(match.id, event.ctrlKey || event.metaKey);
            return;
        }
        if (event.ctrlKey || event.metaKey) return;
        addNote(Math.floor(point.tick / snapTicks) * snapTicks, point.pitch);
    }

    return {
        ...selectionEdits,
        cursor,
        undo: history.undo,
        redo: history.redo,
        menuNoteId,
        handleCanvasContextMenu,
        handleCanvasClick,
        handleEditorKeyDown,
        deleteNote,
        selectNote,
        addNote,
        alert: announcement.text,
        announcement,
        activeNoteId,
        handleCanvasPointerDown,
        announce,
        activateNote,
        gestureModeRef,
        dragScaleRef,
    };
}
