import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { BEATS_PER_BAR, PPQ } from '@/features/piano-roll/constants';
import type { Note } from '@/features/piano-roll/types';
import { MAX_MIDI_BYTES } from '@/features/piano-roll/midi/importLimits';

export type MidiImportOptions = {
    onBeforeImport?: () => void;
    onImported?: (notes: readonly Note[], endTick: number) => void;
};

export function useMidiImport({
    onBeforeImport,
    onImported,
}: MidiImportOptions) {
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pendingRef = useRef(false);
    const mountedRef = useRef(false);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    async function importMidi(file: File): Promise<void> {
        if (pendingRef.current) return;
        pendingRef.current = true;
        setIsImporting(true);
        setError(null);
        try {
            if (file.size > MAX_MIDI_BYTES)
                throw new Error('Choose a MIDI file no larger than 2 MB.');
            const [data, { parseMidi }] = await Promise.all([
                file.arrayBuffer(),
                import('@/features/piano-roll/midi/parseMidi'),
            ]);
            if (!mountedRef.current) return;
            const result = parseMidi(new Uint8Array(data));
            const notes = result.notes.map((note, index) => ({
                ...note,
                id: crypto.randomUUID(),
                selected: index === 0,
            }));
            onBeforeImport?.();
            useNoteStore.getState().importNotes(notes);
            onImported?.(notes, result.endTick);
            const overflow = result.endTick > 32 * BEATS_PER_BAR * PPQ;
            toast.success('MIDI imported', {
                id: 'midi-import',
                description: `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}. Undo restores your previous composition.${overflow ? ' Notes beyond 32 bars are preserved in the note list, playback and export.' : ''}`,
            });
        } catch (cause) {
            if (!mountedRef.current) return;
            const message =
                cause instanceof Error
                    ? cause.message
                    : 'Choose a valid MIDI file and try again.';
            setError(message);
            toast.error('Could not import MIDI', {
                id: 'midi-import',
                description: message,
            });
        } finally {
            pendingRef.current = false;
            if (mountedRef.current) setIsImporting(false);
        }
    }

    return { importMidi, isImporting, error };
}
