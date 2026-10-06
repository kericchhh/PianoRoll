import { create } from 'zustand';
import type { NoteStoreState } from '@/features/piano-roll/types';
import { SNAP_TICKS } from '@/features/piano-roll/constants';

export const useNoteStore = create<NoteStoreState>()((set, get) => ({
    notes: {},
    addNote: (note) =>
        set((state) => ({
            notes: {
                ...state.notes,
                [note.id]: note,
            },
        })),
    pasteNotes: (pasted) =>
        set((state) => {
            if (pasted.length === 0) return state;
            const ids = new Set(pasted.map((note) => note.id));
            if (
                ids.size !== pasted.length ||
                pasted.some((note) => Object.hasOwn(state.notes, note.id))
            )
                return state;
            const notes = { ...state.notes };
            for (const note of Object.values(state.notes)) {
                if (note.selected)
                    notes[note.id] = { ...note, selected: false };
            }
            for (const note of pasted) {
                notes[note.id] = { ...note, selected: true };
            }
            return { notes };
        }),
    selectNote: (id) => {
        if (get().notes[id]) get().selectNotes([id]);
    },
    selectNotes: (ids) =>
        set((state) => {
            const selection = new Set(ids);
            let notes = state.notes;
            for (const [id, note] of Object.entries(state.notes)) {
                const selected = selection.has(id);
                if (note.selected === selected) continue;
                if (notes === state.notes) notes = { ...state.notes };
                notes[id] = { ...note, selected };
            }
            return notes === state.notes ? state : { notes };
        }),
    toggleNoteSelection: (id) =>
        set((state) => {
            const note = state.notes[id];
            if (!note) return state;
            return {
                notes: {
                    ...state.notes,
                    [id]: { ...note, selected: !note.selected },
                },
            };
        }),
    moveNote: (id, startTick, pitch) =>
        get().moveNotes([{ id, startTick, pitch }]),
    moveNotes: (positions) =>
        set((state) => {
            let notes = state.notes;
            for (const { id, startTick, pitch } of positions) {
                const note = notes[id];
                if (
                    !note ||
                    (note.startTick === startTick && note.pitch === pitch)
                )
                    continue;
                if (notes === state.notes) notes = { ...state.notes };
                notes[id] = { ...note, startTick, pitch };
            }
            return notes === state.notes ? state : { notes };
        }),
    resizeNote: (id, durationTicks) =>
        get().resizeNotes([{ id, durationTicks }]),
    resizeNotes: (durations) =>
        set((state) => {
            let notes = state.notes;
            for (const { id, durationTicks } of durations) {
                const note = notes[id];
                if (
                    !note ||
                    !Number.isInteger(durationTicks) ||
                    durationTicks < SNAP_TICKS ||
                    note.durationTicks === durationTicks
                )
                    continue;
                if (notes === state.notes) notes = { ...state.notes };
                notes[id] = { ...note, durationTicks };
            }
            return notes === state.notes ? state : { notes };
        }),
    deleteNote: (id) => get().deleteNotes([id]),
    deleteNotes: (ids) =>
        set((state) => {
            let notes = state.notes;
            for (const id of ids) {
                if (!Object.hasOwn(notes, id)) continue;
                if (notes === state.notes) notes = { ...state.notes };
                delete notes[id];
            }
            return notes === state.notes ? state : { notes };
        }),
}));
