import { useRef, useState, type MouseEvent } from "react";
import { useDrag } from "@use-gesture/react";
import type { PianoRollView, Note } from "@/features/piano-roll/types";
import { eventToMusicPoint } from "@/features/piano-roll/utils/eventToMusicPoint";
import { findNoteAt } from "@/features/piano-roll/utils/findNoteAt";
import { useNoteStore } from "@/features/piano-roll/store/useNoteStore";
import { snapTick } from "@/features/piano-roll/utils/snapTick";
import { moveNoteGroup } from "@/features/piano-roll/utils/moveNoteGroup";
import { DEFAULT_NOTE_DURATION_TICKS, DEFAULT_NOTE_VELOCITY, SNAP_TICKS } from "@/features/piano-roll/constants";
import type { KeyboardEvent, RefObject } from "react";

type Options = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    width: number,
    height: number,
    getView: () => PianoRollView,
    endTick: number;
    dragCandidateRef: RefObject<Note | null>;
    previewRef: RefObject<Record<string, Note> | null>;
    requestRedraw: () => void;
};

export function useNoteInteractions({ canvasRef, width, height, getView, endTick, dragCandidateRef, previewRef, requestRedraw }: Options) {
    const [menuNoteId, SetMenuNoteId] = useState<string | null>(null);
    const [alert, setAlert] = useState("");
    const suppressClickRef = useRef(false);
    const dragNotesRef = useRef<readonly Note[]>([]);

    function commitMove(originals: readonly Note[], moved: readonly Note[]) {
        if (moved === originals || moved.length === 0) return;
        useNoteStore.getState().moveNotes(moved);
        setAlert(moved.length === 1
            ? `Moved pitch ${originals[0].pitch} to ${moved[0].pitch} at tick ${moved[0].startTick}`
            : `Moved ${moved.length} notes`);
    }

    function selectNote(id: string, additive = false) {
        const store = useNoteStore.getState();
        if (!store.notes[id]) return;
        if (additive) store.toggleNoteSelection(id);
        else store.selectNote(id);
        const count = Object.values(useNoteStore.getState().notes).filter(note => note.selected).length;
        setAlert(`${count} ${count === 1 ? 'note' : 'notes'} selected`);
    }

    useDrag(
        ({ movement: [dx, dy], last, tap }) => {
            const original = dragCandidateRef.current;
            if (!original) return;

            if (tap) {
                previewRef.current = null;
                dragCandidateRef.current = null;
                dragNotesRef.current = [];
                requestRedraw();
                return;
            }

            if (dragNotesRef.current.length === 0) {
                const store = useNoteStore.getState();
                const anchor = store.notes[original.id];
                if (!anchor) return;
                if (anchor.selected) {
                    dragNotesRef.current = Object.values(store.notes).filter(note => note.selected);
                } else {
                    store.selectNote(anchor.id);
                    dragNotesRef.current = [useNoteStore.getState().notes[anchor.id]];
                }
            }

            const originals = dragNotesRef.current;
            const view = getView();
            const tickDelta = snapTick(original.startTick + dx / view.pixelsPerTick, SNAP_TICKS) - original.startTick;
            const pitchDelta = -Math.round(dy / view.rowHeight);
            const moved = moveNoteGroup(originals, tickDelta, pitchDelta, endTick);
            suppressClickRef.current = true;

            if (last) {
                previewRef.current = null;
                dragCandidateRef.current = null;
                dragNotesRef.current = [];
                commitMove(originals, moved);
                requestRedraw();
                return;
            }

            previewRef.current = Object.fromEntries(moved.map(note => [note.id, note]));
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
        if (event.shiftKey) return
        const point = eventToMusicPoint(event, width, height, getView())
        if (!point) return
        const match = findNoteAt(useNoteStore.getState().notes, point.tick, point.pitch)
        if (match) {
            selectNote(match.id, event.ctrlKey || event.metaKey)
            return
        }
        if (event.ctrlKey || event.metaKey) return
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
        if (event.target instanceof HTMLElement && 
            event.target.closest("input, textarea, select, [contenteditable]")
           ) return

        if (event.key !== "Delete" && !event.key.startsWith("Arrow")) return
        const selected = Object.values(useNoteStore.getState().notes).filter(note => note.selected)
        if (selected.length === 0) return

        if (event.key === "Delete") {
            if (event.repeat) return
            event.preventDefault()
            event.currentTarget.focus({ preventScroll: true})
            if (selected.length === 1) deleteNote(selected[0].id)
            else {
                useNoteStore.getState().deleteNotes(selected.map(note => note.id))
                setAlert(`Deleted ${selected.length} notes`)
            }
            return
        }

        if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
        let tickDelta = 0
        let pitchDelta = 0
        switch (event.key) {
            case "ArrowLeft": tickDelta = -SNAP_TICKS; break
            case "ArrowRight": tickDelta = SNAP_TICKS; break
            case "ArrowUp": pitchDelta = 1; break
            case "ArrowDown": pitchDelta = -1; break
            default: return
        }

        event.preventDefault()
        commitMove(selected, moveNoteGroup(selected, tickDelta, pitchDelta, endTick))
    }

    function handleCanvasPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
        dragCandidateRef.current = null;
        dragNotesRef.current = [];
        suppressClickRef.current = false;
        if (event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey) return
        const point = eventToMusicPoint(event, width, height, getView())
        dragCandidateRef.current = point
            ? findNoteAt(useNoteStore.getState().notes, point.tick, point.pitch) ?? null
            : null
    }

    return { menuNoteId, handleCanvasContextMenu, handleCanvasClick, handleEditorKeyDown, deleteNote, selectNote, alert, handleCanvasPointerDown }
}
