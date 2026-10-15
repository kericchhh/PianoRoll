import type { KeyboardEvent, RefObject } from 'react';
import type { GestureMode } from '@/features/piano-roll/types';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { SNAP_TICKS } from '@/features/piano-roll/constants';

type Options = {
    gestureModeRef: RefObject<GestureMode>;
    moveSelection: (tickDelta: number, pitchDelta: number) => void;
    resizeSelection: (tickDelta: number) => void;
    deleteNotes: (ids: readonly string[]) => void;
    copyNotes: () => void;
    pasteNotes: () => void;
    undo: () => void;
    redo: () => void;
    onTogglePlayback?: () => void;
};

export function useNoteKeyboard({
    gestureModeRef,
    moveSelection,
    resizeSelection,
    deleteNotes,
    copyNotes,
    pasteNotes,
    undo,
    redo,
    onTogglePlayback,
}: Options) {
    return function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (
            event.defaultPrevented ||
            !(event.target instanceof HTMLElement) ||
            !event.currentTarget.contains(event.target) ||
            event.target.closest(
                'input, textarea, select, [contenteditable], [role="menu"]',
            )
        )
            return;
        if (gestureModeRef.current !== 'idle') return;
        if (
            (event.ctrlKey || event.metaKey) &&
            !event.altKey &&
            event.key.toLowerCase() === 'z'
        ) {
            event.preventDefault();
            if (event.repeat) return;
            if (event.shiftKey) redo();
            else undo();
            return;
        }
        if (
            event.key === ' ' &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            !event.shiftKey &&
            onTogglePlayback
        ) {
            event.preventDefault();
            if (event.repeat) return;
            onTogglePlayback();
            return;
        }
        if (
            (event.ctrlKey || event.metaKey) &&
            !event.altKey &&
            !event.shiftKey &&
            (event.key.toLowerCase() === 'c' || event.key.toLowerCase() === 'v')
        ) {
            if (event.repeat) return;
            event.preventDefault();
            if (event.key.toLowerCase() === 'c') copyNotes();
            else pasteNotes();
            return;
        }
        if (event.key !== 'Delete' && !event.key.startsWith('Arrow')) return;
        const selected = Object.values(useNoteStore.getState().notes).filter(
            (note) => note.selected,
        );
        if (selected.length === 0) return;
        if (event.key === 'Delete') {
            if (event.repeat) return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            deleteNotes(selected.map((note) => note.id));
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.shiftKey) {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            resizeSelection(
                event.key === 'ArrowLeft' ? -SNAP_TICKS : SNAP_TICKS,
            );
            return;
        }
        let tickDelta = 0,
            pitchDelta = 0;
        switch (event.key) {
            case 'ArrowLeft':
                tickDelta = -SNAP_TICKS;
                break;
            case 'ArrowRight':
                tickDelta = SNAP_TICKS;
                break;
            case 'ArrowUp':
                pitchDelta = 1;
                break;
            case 'ArrowDown':
                pitchDelta = -1;
                break;
            default:
                return;
        }
        event.preventDefault();
        moveSelection(tickDelta, pitchDelta);
    };
}
