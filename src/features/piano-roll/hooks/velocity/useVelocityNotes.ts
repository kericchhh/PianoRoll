import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Note } from '@/features/piano-roll/types';
import type { PianoRollEditorModel } from '@/features/piano-roll/hooks/editor/usePianoRollEditor';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { useVelocityKeyboard } from './useVelocityKeyboard';

type VelocityPreview = { id: string; velocity: number };

export function useVelocityNotes(editor: PianoRollEditorModel) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);
    const previewRef = useRef<VelocityPreview | null>(null);
    const pendingFocusRef = useRef<string | null>(null);
    const originRef = useRef<{
        note: Note;
        notes: Record<string, Note>;
    } | null>(null);
    const ordered = useMemo(
        () =>
            Object.values(editor.notes).sort(
                (a, b) =>
                    a.startTick - b.startTick ||
                    a.pitch - b.pitch ||
                    a.id.localeCompare(b.id),
            ),
        [editor.notes],
    );
    const activeNote = editor.notes[activeId ?? ''] ?? ordered[0];
    const { gestureModeRef, announce } = editor.interactions;
    const { requestRedraw } = editor;
    const { reveal: revealNote } = editor.viewport;

    const focusNote = useCallback(
        (id: string, reveal = false) => {
            const note = useNoteStore.getState().notes[id];
            if (!note) return;
            setActiveId(id);
            if (reveal) {
                pendingFocusRef.current = id;
                revealNote([note]);
            }
            requestRedraw();
        },
        [requestRedraw, revealNote],
    );
    const commit = useCallback(
        (id: string, velocity: number) => {
            const store = useNoteStore.getState();
            const note = store.notes[id];
            if (!note || note.velocity === velocity) return;
            store.setNoteVelocity(id, velocity);
            if (useNoteStore.getState().notes[id]?.velocity !== velocity)
                return;
            announce(
                `Set velocity to ${velocity} for pitch ${note.pitch} at tick ${note.startTick}`,
            );
        },
        [announce],
    );
    const finish = useCallback(
        (cancel = false) => {
            const origin = originRef.current;
            if (!origin) return;
            const value = previewRef.current;
            originRef.current = null;
            previewRef.current = null;
            if (gestureModeRef.current === 'velocity')
                gestureModeRef.current = 'idle';
            if (
                !cancel &&
                value &&
                useNoteStore.getState().notes === origin.notes
            )
                commit(origin.note.id, value.velocity);
            setRevision((previous) => previous + 1);
            requestRedraw();
        },
        [commit, requestRedraw, gestureModeRef],
    );
    const begin = useCallback(
        (id: string) => {
            if (gestureModeRef.current !== 'idle') return false;
            const notes = useNoteStore.getState().notes;
            const note = notes[id];
            if (!note) return false;
            originRef.current = { note, notes };
            previewRef.current = { id, velocity: note.velocity };
            gestureModeRef.current = 'velocity';
            focusNote(id);
            return true;
        },
        [focusNote, gestureModeRef],
    );
    const preview = useCallback((id: string, velocity: number) => {
        if (originRef.current?.note.id !== id) return;
        previewRef.current = { id, velocity };
    }, []);

    const finishRef = useRef(finish);
    useEffect(() => {
        finishRef.current = finish;
    });
    useEffect(() => {
        const release = () => queueMicrotask(() => finishRef.current());
        const cancel = () => finishRef.current(true);
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('blur', cancel);
        return () => {
            window.removeEventListener('pointerup', release);
            window.removeEventListener('pointercancel', cancel);
            window.removeEventListener('blur', cancel);
            originRef.current = null;
            previewRef.current = null;
            if (gestureModeRef.current === 'velocity')
                gestureModeRef.current = 'idle';
        };
    }, [gestureModeRef]);
    useEffect(() => {
        if (originRef.current && originRef.current.notes !== editor.notes)
            finishRef.current(true);
    }, [editor.notes]);

    const handleKeyDown = useVelocityKeyboard(
        editor,
        ordered,
        activeNote,
        focusNote,
        commit,
    );
    return {
        activeNote,
        activeId: activeNote?.id ?? null,
        revision,
        previewRef,
        pendingFocusRef,
        begin,
        preview,
        finish,
        focusNote,
        commit,
        handleKeyDown,
    };
}

export type VelocityNotes = ReturnType<typeof useVelocityNotes>;
