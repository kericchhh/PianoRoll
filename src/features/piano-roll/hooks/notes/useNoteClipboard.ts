import { useCallback, useRef } from 'react';
import type { Note } from '@/features/piano-roll/types';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import {
    pasteNoteGroup,
    type CopiedNote,
} from '@/features/piano-roll/utils/notes/pasteNoteGroup';

type Options = {
    endTick: number;
    announce: (text: string) => void;
    onActivate: (id: string) => void;
    onReveal?: (notes: readonly Note[]) => void;
};

export function useNoteClipboard({
    endTick,
    announce,
    onActivate,
    onReveal,
}: Options) {
    const clipboardRef = useRef<readonly CopiedNote[]>([]);
    const nextPasteTickRef = useRef(0);

    const copyNotes = useCallback(() => {
        const selected = Object.values(useNoteStore.getState().notes).filter(
            (note) => note.selected,
        );
        if (selected.length === 0) {
            announce('Select notes to copy');
            return;
        }
        clipboardRef.current = selected.map(
            ({ pitch, startTick, durationTicks, velocity }) => ({
                pitch,
                startTick,
                durationTicks,
                velocity,
            }),
        );
        nextPasteTickRef.current = selected.reduce(
            (end, note) => Math.max(end, note.startTick + note.durationTicks),
            0,
        );
        announce(
            `Copied ${selected.length} ${selected.length === 1 ? 'note' : 'notes'}`,
        );
    }, [announce]);

    const pasteNotes = useCallback(() => {
        if (clipboardRef.current.length === 0) {
            announce('No copied notes to paste');
            return;
        }
        const store = useNoteStore.getState();
        const selected = Object.values(store.notes).filter(
            (note) => note.selected,
        );
        const targetTick =
            selected.length > 0
                ? selected.reduce(
                      (end, note) =>
                          Math.max(end, note.startTick + note.durationTicks),
                      0,
                  )
                : nextPasteTickRef.current;
        const placed = pasteNoteGroup(
            clipboardRef.current,
            targetTick,
            endTick,
        );
        if (!placed) {
            announce('Cannot paste: copied notes do not fit in the timeline');
            return;
        }
        const pasted: Note[] = placed.map((note) => ({
            ...note,
            id: crypto.randomUUID(),
            selected: true,
        }));
        store.pasteNotes(pasted);
        nextPasteTickRef.current = pasted.reduce(
            (end, note) => Math.max(end, note.startTick + note.durationTicks),
            0,
        );
        onActivate(pasted[0].id);
        onReveal?.(pasted);
        const firstTick = pasted.reduce(
            (tick, note) => Math.min(tick, note.startTick),
            Infinity,
        );
        announce(
            `Pasted ${pasted.length} ${pasted.length === 1 ? 'note' : 'notes'} at tick ${firstTick}`,
        );
    }, [announce, endTick, onReveal, onActivate]);

    return { copyNotes, pasteNotes };
}
