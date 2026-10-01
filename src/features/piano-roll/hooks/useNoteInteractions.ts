import { useRef, useState, type MouseEvent } from "react";
import { useDrag } from "@use-gesture/react";
import type { PianoRollView, Note } from "@/features/piano-roll/types";
import { eventToMusicPoint } from "@/features/piano-roll/utils/eventToMusicPoint";
import { findNoteAt } from "@/features/piano-roll/utils/findNoteAt";
import { useNoteStore } from "@/features/piano-roll/store/useNoteStore";
import { snapTick } from "@/features/piano-roll/utils/snapTick";
import { DEFAULT_NOTE_DURATION_TICKS, DEFAULT_NOTE_VELOCITY, SNAP_TICKS } from "@/features/piano-roll/constants";
import type { KeyboardEvent, RefObject } from "react";

type Options = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    width: number,
    height: number,
    getView: () => PianoRollView,
    endTick: number;
    dragCandidateRef: RefObject<Note | null>;
    previewRef: RefObject<Note | null>;
    requestRedraw: () => void;
};

export function useNoteInteractions({ canvasRef, width, height, getView, endTick, dragCandidateRef, previewRef, requestRedraw }: Options) {
    const [menuNoteId, SetMenuNoteId] = useState<string | null>(null);
    const [alert, setAlert] = useState("");
    const suppressClickRef = useRef(false);

    useDrag(
        ({ movement: [dx, dy], last, tap }) => {
            const original = dragCandidateRef.current;
            if (!original) return;

            if (tap) {
                previewRef.current = null;
                dragCandidateRef.current = null;
                requestRedraw();
                return;
            }

            const view = getView();
            const maxStartTick = Math.max(0, endTick - original.durationTicks);
            const startTick = Math.min(maxStartTick, Math.max(0,
                snapTick(original.startTick + dx / view.pixelsPerTick, SNAP_TICKS)
            ));
            const pitch = Math.min(127, Math.max(0,
                original.pitch - Math.round(dy / view.rowHeight)
            ));
            const moved: Note = {
                ...original,
                startTick,
                pitch,
            };

            if (last) {
                previewRef.current = null;
                dragCandidateRef.current = null;
                if (moved.startTick !== original.startTick || moved.pitch !== original.pitch) {
                    useNoteStore.getState().moveNote(moved.id, moved.startTick, moved.pitch);
                    setAlert(`Moved pitch ${original.pitch} to ${moved.pitch} at tick ${moved.startTick}`);
                }
                requestRedraw();
                return;
            }

            previewRef.current = moved;
            suppressClickRef.current = true;
            requestRedraw();
        },
        { target: canvasRef, filterTaps: true, pointer: { buttons: 1, keys: false } },
    );

    function deleteNote(id: string) {
        const note = useNoteStore.getState().notes[id]
        if (!note) return
        useNoteStore.getState().deleteNote(id)
        setAlert(`Deleted pitch ${note.pitch} at tick ${note.startTick}`)
    }

    function handleCanvasContextMenu(event: MouseEvent<HTMLCanvasElement>) {
        if (event.button !== 2) {
            SetMenuNoteId(null)
            return
        }
        const point = eventToMusicPoint(event, width, height, getView())
        const note = point
            ? findNoteAt(useNoteStore.getState().notes, point.tick, point.pitch)
            : undefined
        SetMenuNoteId(note?.id ?? null)
    };

    function handleCanvasClick(event: MouseEvent<HTMLCanvasElement>) {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        if (event.shiftKey || event.ctrlKey) return
        const point = eventToMusicPoint(event, width, height, getView())
        if (!point) return
        const match = findNoteAt(useNoteStore.getState().notes, point.tick, point.pitch)
        if (match) {
            useNoteStore.getState().selectNote(match.id)
            return
        }
        const startTick = snapTick(point.tick, 120)
        const durationTicks = DEFAULT_NOTE_DURATION_TICKS;
        if (startTick < 0 || startTick + durationTicks > endTick) return
        if (point.pitch < 0 || point.pitch > 127) return
        const note: Note = {
            id: crypto.randomUUID(),
            pitch: point.pitch,
            startTick,
            durationTicks,
            velocity: DEFAULT_NOTE_VELOCITY,
            selected: false
        }
        useNoteStore.getState().addNote(note)
    }

    function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== "Delete" || event.repeat ) return
        if (event.target instanceof HTMLElement && 
            event.target.closest("input, textarea, select, [contenteditable]")
           ) return
        const note = Object.values(useNoteStore.getState().notes).find((note) => note.selected)
        if (!note) return

        event.preventDefault()
        event.currentTarget.focus({ preventScroll: true})
        deleteNote(note.id)
    }

    function handleCanvasPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
        dragCandidateRef.current = null;
        suppressClickRef.current = false;
        if (event.button !== 0 || event.shiftKey) return
        const point = eventToMusicPoint(event, width, height, getView())
        dragCandidateRef.current = point
            ? findNoteAt(useNoteStore.getState().notes, point.tick, point.pitch) ?? null
            : null
    }

    return { menuNoteId, handleCanvasContextMenu, handleCanvasClick, handleEditorKeyDown, deleteNote, alert, handleCanvasPointerDown }
}
