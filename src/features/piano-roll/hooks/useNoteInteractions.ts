import { useState, type MouseEvent } from "react";
import type { PianoRollView, Note } from "@/features/piano-roll/types";
import { eventToMusicPoint } from "@/features/piano-roll/utils/eventToMusicPoint";
import { findNoteAt } from "@/features/piano-roll/utils/findNoteAt";
import { useNoteStore } from "@/features/piano-roll/store/useNoteStore";
import { snapTick } from "@/features/piano-roll/utils/snapTick";
import { DEFAULT_NOTE_DURATION_TICKS, DEFAULT_NOTE_VELOCITY } from "@/features/piano-roll/constants";

type Options = {
    width: number,
    height: number,
    getView: () => PianoRollView,
    endTick: number
};

export function useNoteInteractions({ width, height, getView, endTick }: Options) {
    const [menuNoteId, SetMenuNoteId] = useState<string | null>(null);

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
        // console.log({ startTick, pitch, durationTicks })
        const note: Note = {
            id: crypto.randomUUID(),
            pitch: point.pitch,
            startTick,
            durationTicks,
            velocity: DEFAULT_NOTE_VELOCITY,
            selected: false
        }
        useNoteStore.getState().addNote(note)
        // console.log(useNoteStore.getState())
    }

    return { menuNoteId, handleCanvasContextMenu, handleCanvasClick }
}
