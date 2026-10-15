import { useCallback, type RefObject } from 'react';
import type { GestureMode, Note } from '@/features/piano-roll/types';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { moveNoteGroup } from '@/features/piano-roll/utils/notes/moveNoteGroup';
import { resizeNoteGroup } from '@/features/piano-roll/utils/notes/resizeNoteGroup';

type Options = {
    endTick: number;
    gestureModeRef: RefObject<GestureMode>;
    commitMove: (originals: readonly Note[], moved: readonly Note[]) => void;
    commitResize: (
        originals: readonly Note[],
        resized: readonly Note[],
    ) => void;
};

export function useSelectionEdits({
    endTick,
    gestureModeRef,
    commitMove,
    commitResize,
}: Options) {
    const moveSelection = useCallback(
        (tickDelta: number, pitchDelta: number) => {
            if (gestureModeRef.current !== 'idle') return;
            const selected = Object.values(
                useNoteStore.getState().notes,
            ).filter((note) => note.selected);
            commitMove(
                selected,
                moveNoteGroup(selected, tickDelta, pitchDelta, endTick),
            );
        },
        [commitMove, endTick, gestureModeRef],
    );
    const resizeSelection = useCallback(
        (tickDelta: number) => {
            if (gestureModeRef.current !== 'idle') return;
            const selected = Object.values(
                useNoteStore.getState().notes,
            ).filter((note) => note.selected);
            commitResize(
                selected,
                resizeNoteGroup(selected, tickDelta, endTick),
            );
        },
        [commitResize, endTick, gestureModeRef],
    );

    return { moveSelection, resizeSelection };
}
