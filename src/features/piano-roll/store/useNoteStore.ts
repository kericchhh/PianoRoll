import {create} from "zustand";
import type { NoteStoreState } from "@/features/piano-roll/types";

export const useNoteStore = create<NoteStoreState>()((set, get) => ({
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
    toggleNoteSelection: (id) =>
        set((state) => {
            const note = state.notes[id]
            if (!note) return state
            return {
                notes: {
                    ...state.notes,
                    [id]: { ...note, selected: !note.selected }
                }
            }
        }),
    moveNote: (id, startTick, pitch) => get().moveNotes([{ id, startTick, pitch }]),
    moveNotes: (positions) =>
        set((state) => {
            let notes = state.notes
            for (const { id, startTick, pitch } of positions) {
                const note = notes[id]
                if (!note || (note.startTick === startTick && note.pitch === pitch)) continue
                if (notes === state.notes) notes = { ...state.notes }
                notes[id] = { ...note, startTick, pitch }
            }
            return notes === state.notes ? state : { notes }
        }),
    deleteNote: (id) => get().deleteNotes([id]),
    deleteNotes: (ids) =>
        set((state) => {
            let notes = state.notes
            for (const id of ids) {
                if (!Object.hasOwn(notes, id)) continue
                if (notes === state.notes) notes = { ...state.notes }
                delete notes[id]
            }
            return notes === state.notes ? state : { notes }
        }),
}));
