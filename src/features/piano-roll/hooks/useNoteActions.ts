import { useCallback, useState } from 'react';
import type { Note } from '@/features/piano-roll/types';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { snapTick } from '@/features/piano-roll/utils/snapTick';
import {
    DEFAULT_NOTE_DURATION_TICKS,
    DEFAULT_NOTE_VELOCITY,
    SNAP_TICKS,
} from '@/features/piano-roll/constants';

export function useNoteActions(
    endTick: number,
    onReveal?: (notes: readonly Note[]) => void,
) {
    const [announcement, setAnnouncement] = useState({ text: '', sequence: 0 });
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const announce = useCallback((text: string) => {
        setAnnouncement((previous) => ({
            text,
            sequence: previous.sequence + 1,
        }));
    }, []);

    const announceSelection = useCallback(() => {
        const selected = Object.values(useNoteStore.getState().notes).filter(
            (note) => note.selected,
        );
        setActiveNoteId((previous) =>
            selected.some((note) => note.id === previous)
                ? previous
                : (selected[0]?.id ?? null),
        );
        announce(
            `${selected.length} ${selected.length === 1 ? 'note' : 'notes'} selected`,
        );
    }, [announce]);

    const selectNote = useCallback(
        (id: string, additive = false) => {
            const store = useNoteStore.getState();
            if (!store.notes[id]) return;
            if (additive) store.toggleNoteSelection(id);
            else store.selectNote(id);
            announceSelection();
            const note = useNoteStore.getState().notes[id];
            if (note.selected) {
                setActiveNoteId(id);
                onReveal?.([note]);
            }
        },
        [announceSelection, onReveal],
    );

    const addNote = useCallback(
        (tick: number, pitch: number, selected = false) => {
            const startTick = snapTick(tick, SNAP_TICKS);
            if (
                !Number.isFinite(startTick) ||
                !Number.isInteger(pitch) ||
                pitch < 0 ||
                pitch > 127 ||
                startTick < 0 ||
                startTick + DEFAULT_NOTE_DURATION_TICKS > endTick
            )
                return false;
            const note: Note = {
                id: crypto.randomUUID(),
                pitch,
                startTick,
                durationTicks: DEFAULT_NOTE_DURATION_TICKS,
                velocity: DEFAULT_NOTE_VELOCITY,
                selected,
            };
            const store = useNoteStore.getState();
            store.addNote(note);
            if (selected) {
                store.selectNote(note.id);
                setActiveNoteId(note.id);
                onReveal?.([note]);
            }
            announce(`Added pitch ${pitch} at tick ${startTick}`);
            return true;
        },
        [announce, endTick, onReveal],
    );

    const deleteNotes = useCallback(
        (ids: readonly string[]) => {
            const store = useNoteStore.getState();
            const notes = [...new Set(ids)]
                .map((id) => store.notes[id])
                .filter((note): note is Note => !!note);
            if (notes.length === 0) return;
            store.deleteNotes(ids);
            setActiveNoteId((previous) =>
                previous && !ids.includes(previous) ? previous : null,
            );
            announce(
                notes.length === 1
                    ? `Deleted pitch ${notes[0].pitch} at tick ${notes[0].startTick}`
                    : `Deleted ${notes.length} notes`,
            );
        },
        [announce],
    );

    const deleteNote = useCallback(
        (id: string) => deleteNotes([id]),
        [deleteNotes],
    );

    const commitMove = useCallback(
        (originals: readonly Note[], moved: readonly Note[]) => {
            if (moved === originals || moved.length === 0) return;
            const store = useNoteStore.getState();
            const remaining = moved.filter((note) => !!store.notes[note.id]);
            if (remaining.length === 0) return;
            store.moveNotes(remaining);
            const anchor =
                remaining.find((note) => note.id === activeNoteId) ??
                remaining[0];
            onReveal?.([
                anchor,
                ...remaining.filter((note) => note.id !== anchor.id),
            ]);
            announce(
                remaining.length === 1
                    ? `Moved pitch ${originals[0].pitch} to ${remaining[0].pitch} at tick ${remaining[0].startTick}`
                    : `Moved ${remaining.length} notes; pitch ${remaining[0].pitch}, tick ${remaining[0].startTick}`,
            );
        },
        [activeNoteId, announce, onReveal],
    );

    const commitResize = useCallback(
        (originals: readonly Note[], resized: readonly Note[]) => {
            if (resized === originals || resized.length === 0) return;
            const store = useNoteStore.getState();
            const remaining = resized.filter((note) => {
                const current = store.notes[note.id];
                return current && current.durationTicks !== note.durationTicks;
            });
            if (remaining.length === 0) return;
            store.resizeNotes(remaining);
            const anchor =
                remaining.find((note) => note.id === activeNoteId) ??
                remaining[0];
            onReveal?.([
                anchor,
                ...remaining.filter((note) => note.id !== anchor.id),
            ]);
            announce(
                remaining.length === 1
                    ? `Resized pitch ${anchor.pitch} to duration ${anchor.durationTicks} ticks`
                    : `Resized ${remaining.length} notes; pitch ${anchor.pitch}, duration ${anchor.durationTicks} ticks`,
            );
        },
        [activeNoteId, announce, onReveal],
    );

    return {
        announcement,
        activeNoteId,
        activateNote: setActiveNoteId,
        announceSelection,
        selectNote,
        addNote,
        deleteNote,
        deleteNotes,
        commitMove,
        commitResize,
    };
}
