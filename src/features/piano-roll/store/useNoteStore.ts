import { create } from 'zustand';
import type { NoteStoreState } from '@/features/piano-roll/types';
import type { HistoryDirection } from './commands/types';
import {
    createAddNotesCommand,
    createDeleteNotesCommand,
    createMoveNotesCommand,
    createResizeNotesCommand,
} from './commands/createNoteCommand';
import { executeNoteCommand, stepNoteHistory } from './noteHistory';
import { selectNotesInRecord } from './noteSelection';

export const useNoteStore = create<NoteStoreState>()((set, get) => {
    function step(direction: HistoryDirection) {
        const state = get();
        const command = (
            direction === 'undo' ? state.undoStack : state.redoStack
        ).at(-1);
        if (!command) return null;
        set((current) => stepNoteHistory(current, direction));
        return command;
    }

    return {
        notes: {},
        undoStack: [],
        redoStack: [],
        undo: () => step('undo'),
        redo: () => step('redo'),
        addNote: (note, selectAdded = false) =>
            set((state) =>
                executeNoteCommand(
                    state,
                    createAddNotesCommand(
                        state.notes,
                        [note],
                        'ADD_NOTE',
                        selectAdded,
                    ),
                ),
            ),
        pasteNotes: (pasted) =>
            set((state) =>
                executeNoteCommand(
                    state,
                    createAddNotesCommand(
                        state.notes,
                        pasted,
                        'PASTE_NOTES',
                        true,
                    ),
                ),
            ),
        selectNote: (id) => {
            if (get().notes[id]) get().selectNotes([id]);
        },
        selectNotes: (ids) =>
            set((state) => {
                const notes = selectNotesInRecord(state.notes, ids);
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
            set((state) =>
                executeNoteCommand(
                    state,
                    createMoveNotesCommand(state.notes, positions),
                ),
            ),
        resizeNote: (id, durationTicks) =>
            get().resizeNotes([{ id, durationTicks }]),
        resizeNotes: (durations) =>
            set((state) =>
                executeNoteCommand(
                    state,
                    createResizeNotesCommand(state.notes, durations),
                ),
            ),
        deleteNote: (id) => get().deleteNotes([id]),
        deleteNotes: (ids) =>
            set((state) =>
                executeNoteCommand(
                    state,
                    createDeleteNotesCommand(state.notes, ids),
                ),
            ),
    };
});
