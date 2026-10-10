import { Button } from '@/shared/components/ui/button';
import { ImportFileButton } from '@/shared/components/ImportFileButton';
import { InstrumentSampleRow } from './InstrumentSampleRow';
import type { useCustomInstrument } from '@/features/piano-roll/hooks/playback/useCustomInstrument';

type Props = Pick<
    ReturnType<typeof useCustomInstrument>,
    | 'draft'
    | 'chooseFolder'
    | 'setFilePitch'
    | 'removeFile'
    | 'cancelFolder'
    | 'loadFolder'
    | 'isLoading'
    | 'loadedCount'
> & { describedBy: string };

export function InstrumentFolderImport({
    draft,
    chooseFolder,
    setFilePitch,
    removeFile,
    cancelFolder,
    loadFolder,
    isLoading,
    loadedCount,
    describedBy,
}: Props) {
    return (
        <div
            className={
                draft
                    ? 'flex min-h-0 flex-1 flex-col gap-3'
                    : 'shrink-0 space-y-3'
            }
        >
            <ImportFileButton
                label="Import instrument folder"
                loadingLabel="Loading instrument…"
                fileLabel="Instrument sample folder"
                accept="audio/*"
                directory
                isLoading={isLoading}
                describedBy={describedBy}
                onFiles={chooseFolder}
            />
            {draft && (
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden border border-border p-3">
                    <p className="text-sm font-bold wrap-anywhere">
                        {draft.name}: {draft.files.length} samples
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Assign each sample’s original MIDI pitch. Remove
                        duplicate pitches.
                    </p>
                    <ul
                        aria-label="Sample pitch assignments"
                        className="min-h-0 flex-1 overflow-y-auto"
                    >
                        {draft.files.map((entry) => (
                            <InstrumentSampleRow
                                key={entry.id}
                                entry={entry}
                                disabled={isLoading}
                                onPitch={(pitch) =>
                                    setFilePitch(entry.id, pitch)
                                }
                                onRemove={() => removeFile(entry.id)}
                            />
                        ))}
                    </ul>
                    <p role="status" className="text-xs text-muted-foreground">
                        {isLoading
                            ? `Decoded ${loadedCount} of ${draft.files.length} samples…`
                            : 'Review pitches, then load.'}
                    </p>
                    <div className="flex shrink-0 gap-2">
                        <Button
                            type="button"
                            aria-disabled={isLoading}
                            aria-busy={isLoading}
                            onClick={() => {
                                if (!isLoading) void loadFolder();
                            }}
                        >
                            Load instrument
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            aria-label="Cancel folder import"
                            onClick={cancelFolder}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
