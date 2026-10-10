import { useId } from 'react';
import { ImportFileButton } from '@/shared/components/ImportFileButton';
import {
    useMidiImport,
    type MidiImportOptions,
} from '@/features/piano-roll/hooks/midi/useMidiImport';

export function MidiImportButton(props: MidiImportOptions) {
    const id = useId();
    const { importMidi, isImporting, error } = useMidiImport(props);
    return (
        <div className="space-y-2">
            <ImportFileButton
                label="Import MIDI"
                loadingLabel="Importing MIDI…"
                fileLabel="MIDI file"
                accept=".mid,.midi,audio/midi,audio/x-midi"
                isLoading={isImporting}
                describedBy={`${id}-hint${error ? ` ${id}-error` : ''}`}
                onFile={importMidi}
            />
            <p id={`${id}-hint`} className="text-sm text-muted-foreground">
                Replaces notes in one undoable step. Tracks share the current
                instrument. Uses the current tempo and 4/4 grid; controller
                events are omitted. Up to 2 MB.
            </p>
            {error && (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="text-sm text-destructive"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
