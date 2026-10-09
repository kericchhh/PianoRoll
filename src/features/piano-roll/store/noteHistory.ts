import type { NoteStoreState } from '@/features/piano-roll/types';
import type { HistoryDirection, NoteCommand } from './commands/types';
import { applyNoteCommand } from './commands/applyNoteCommand';

type HistoryState = Pick<NoteStoreState, 'notes' | 'undoStack' | 'redoStack'>;

export function executeNoteCommand(
    state: HistoryState,
    command: NoteCommand | null,
): HistoryState {
    if (!command) return state;
    return {
        notes: applyNoteCommand(state.notes, command, 'do'),
        undoStack: [...state.undoStack, command],
        redoStack: [],
    };
}

export function stepNoteHistory(
    state: HistoryState,
    direction: HistoryDirection,
): HistoryState {
    const source = direction === 'undo' ? state.undoStack : state.redoStack;
    const command = source.at(-1);
    if (!command) return state;
    return {
        notes: applyNoteCommand(
            state.notes,
            command,
            direction === 'undo' ? 'undo' : 'do',
        ),
        undoStack:
            direction === 'undo'
                ? state.undoStack.slice(0, -1)
                : [...state.undoStack, command],
        redoStack:
            direction === 'undo'
                ? [...state.redoStack, command]
                : state.redoStack.slice(0, -1),
    };
}
