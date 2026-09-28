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
}));
