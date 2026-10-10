import { useCallback, type RefObject } from 'react';
import type { GestureMode, Note } from '@/features/piano-roll/types';
import type {
    HistoryDirection,
    NoteCommand,
} from '@/features/piano-roll/store/commands/types';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';

const COMMAND_NAMES: Record<NoteCommand['type'], string> = {
    ADD_NOTE: 'addition',
    PASTE_NOTES: 'paste',
    IMPORT_NOTES: 'MIDI import',
    DELETE_NOTES: 'deletion',
    MOVE_NOTES: 'move',
    RESIZE_NOTES: 'resize',
};

type Options = {
    gestureModeRef: RefObject<GestureMode>;
    editorRef?: RefObject<HTMLDivElement | null>;
    activeNoteId: string | null;
    onActivate: (id: string | null) => void;
    onReveal?: (notes: readonly Note[]) => void;
    announce: (text: string) => void;
};

export function useNoteHistory({
    gestureModeRef,
    editorRef,
    activeNoteId,
    onActivate,
    onReveal,
    announce,
}: Options) {
    const step = useCallback(
        (direction: HistoryDirection) => {
            if (gestureModeRef.current !== 'idle') return;
            const command = useNoteStore.getState()[direction]();
            if (!command) {
                announce(`Nothing to ${direction}`);
                return;
            }
            const { notes } = useNoteStore.getState();
            const focused = document.activeElement;
            const noteElement =
                focused instanceof HTMLElement
                    ? focused.closest<HTMLElement>('[data-note-id]')
                    : null;
            const focusedNote = notes[noteElement?.dataset.noteId ?? ''];
            if (
                noteElement &&
                editorRef?.current?.contains(noteElement) &&
                (!focusedNote ||
                    (noteElement.hasAttribute('data-note-overlay') &&
                        !focusedNote.selected))
            )
                editorRef.current.focus({ preventScroll: true });
            const selected = Object.values(notes).filter(
                (note) => note.selected,
            );
            const anchor =
                selected.find((note) => note.id === activeNoteId) ??
                selected[0];
            onActivate(anchor?.id ?? null);
            if (anchor)
                onReveal?.([
                    anchor,
                    ...selected.filter((note) => note.id !== anchor.id),
                ]);
            const count =
                command.type === 'DELETE_NOTES'
                    ? command.deleted.length
                    : 'notes' in command
                      ? command.notes.length
                      : command.changes.length;
            announce(
                `${direction === 'undo' ? 'Undid' : 'Redid'} ${COMMAND_NAMES[command.type]} of ${count} ${count === 1 ? 'note' : 'notes'}`,
            );
        },
        [
            gestureModeRef,
            editorRef,
            activeNoteId,
            onActivate,
            onReveal,
            announce,
        ],
    );

    return { undo: () => step('undo'), redo: () => step('redo') };
}
