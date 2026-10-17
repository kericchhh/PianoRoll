import type { KeyboardEvent } from 'react';
import type { Note } from '@/features/piano-roll/types';
import type { PianoRollEditorModel } from '@/features/piano-roll/hooks/editor/usePianoRollEditor';

export function useVelocityKeyboard(
    editor: PianoRollEditorModel,
    ordered: readonly Note[],
    activeNote: Note | undefined,
    focusNote: (id: string, reveal?: boolean) => void,
    commit: (id: string, velocity: number) => void,
) {
    return function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (
            ((event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'z') ||
            event.key === ' '
        ) {
            editor.interactions.handleEditorKeyDown(event);
            return;
        }
        if (
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            !activeNote ||
            editor.interactions.gestureModeRef.current !== 'idle'
        ) {
            if (
                [
                    'ArrowLeft',
                    'ArrowRight',
                    'ArrowUp',
                    'ArrowDown',
                    'Home',
                    'End',
                    'PageUp',
                    'PageDown',
                ].includes(event.key)
            )
                event.preventDefault();
            return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const index = ordered.findIndex(
                (note) => note.id === activeNote.id,
            );
            const next =
                ordered[
                    Math.max(
                        0,
                        Math.min(
                            ordered.length - 1,
                            index + (event.key === 'ArrowLeft' ? -1 : 1),
                        ),
                    )
                ];
            focusNote(next.id, true);
        } else if (
            ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
        ) {
            event.preventDefault();
            const value =
                event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? 127
                      : Math.max(
                            0,
                            Math.min(
                                127,
                                activeNote.velocity +
                                    (event.key === 'ArrowUp' ? 1 : -1),
                            ),
                        );
            commit(activeNote.id, value);
        }
    };
}
