import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { toast } from 'sonner';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { downloadMidi } from '@/features/piano-roll/midi/downloadMidi';

const EXPORT_TOAST_ID = 'midi-export';

export function useMidiExport() {
    const [isExporting, setIsExporting] = useState(false);
    const pendingRef = useRef(false);
    const mountedRef = useRef(false);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    async function exportMidi(): Promise<void> {
        if (pendingRef.current) return;
        pendingRef.current = true;
        setIsExporting(true);
        try {
            const notes = Object.values(useNoteStore.getState().notes);
            const bpm = Tone.getTransport().bpm.value;
            const { serializeMidi } =
                await import('@/features/piano-roll/midi/serializeMidi');
            if (!mountedRef.current) return;
            const result = serializeMidi(notes, bpm);
            downloadMidi(result.bytes);
            toast.success('MIDI download started', {
                id: EXPORT_TOAST_ID,
                description: `${result.noteCount} ${result.noteCount === 1 ? 'note' : 'notes'} exported.${result.omittedNoteCount > 0 ? ` ${result.omittedNoteCount} silent ${result.omittedNoteCount === 1 ? 'note' : 'notes'} omitted.` : ''}`,
            });
        } catch {
            if (mountedRef.current)
                toast.error('Could not export MIDI. Try again.', {
                    id: EXPORT_TOAST_ID,
                });
        } finally {
            pendingRef.current = false;
            if (mountedRef.current) setIsExporting(false);
        }
    }

    return { exportMidi, isExporting };
}
