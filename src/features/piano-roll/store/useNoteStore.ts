import {create} from "zustand";
import type { NoteStoreState } from "@/features/piano-roll/types";

export const useNoteStore = create<NoteStoreState>()((set) => ({
    notes: {},
    addNote: (note) =>
        set((state) => ({
            notes: {
                ...state.notes,
                [note.id]: note
            }
        })),
    selectNote: (id: string) =>
        set((state) => {
            if (!state.notes[id]) return state
            const nextNotes: NoteStoreState["notes"] = {}
            for (const [noteId, note] of Object.entries(state.notes)) {
                const selected = noteId === id
                nextNotes[noteId] = 
                    note.selected === selected ? note : { ...note, selected }
            }

            return {notes: nextNotes}
        }),
    moveNote: (id, startTick, pitch) =>
        set((state) => {
            const note = state.notes[id]
            if (!note || (note.startTick === startTick && note.pitch === pitch)) return state
            return {
                notes: {
                    ...state.notes,
                    [id]: { ...note, startTick, pitch }
                }
            }
        }),
    deleteNote: (id: string) =>
        set((state) => {
            if (!Object.hasOwn(state.notes, id)) return state
            const notes = {...state.notes}
            delete notes[id]
            return { notes }
        })
}));
