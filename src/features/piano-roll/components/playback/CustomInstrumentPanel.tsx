import { useId, useState } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { Collapsible } from 'radix-ui';
import { motion } from 'motion/react';
import { Button } from '@/shared/components/ui/button';
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';
import { SampleRootSelect } from './SampleRootSelect';
import type { useCustomInstrument } from '@/features/piano-roll/hooks/playback/useCustomInstrument';
import { ImportFileButton } from '@/shared/components/ImportFileButton';
import { InstrumentFolderImport } from './InstrumentFolderImport';

export function CustomInstrumentPanel({
    instrument,
    importSample,
    resetSample,
    setRootPitch,
    isLoading,
    error,
    ...folderControls
}: ReturnType<typeof useCustomInstrument>) {
    const [draftPitch, setDraftPitch] = useState(60);
    const [singleOpen, setSingleOpen] = useState(false);
    const reducedMotion = usePrefersReducedMotion();
    const transition = {
        duration: reducedMotion ? 0 : 0.3,
        ease: [0.22, 1, 0.36, 1] as const,
    };
    const id = useId();
    const singleSample =
        instrument?.samples.length === 1 ? instrument.samples[0] : null;
    const rootPitch = singleSample?.rootPitch ?? draftPitch;
    return (
        <section
            aria-label="Instrument samples"
            className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4"
        >
            <h2 className="font-bold">Instrument</h2>
            <p className="text-sm wrap-anywhere">
                {instrument
                    ? `${instrument.name} · ${instrument.samples.length} ${instrument.samples.length === 1 ? 'sample' : 'samples'}`
                    : 'Salamander Grand Piano'}
            </p>
            <motion.div
                className={
                    folderControls.draft
                        ? 'flex min-h-0 flex-1 flex-col gap-3'
                        : 'shrink-0 overflow-hidden'
                }
                initial={false}
                animate={{
                    height: singleOpen && !folderControls.draft ? 0 : 'auto',
                    opacity: singleOpen && !folderControls.draft ? 0 : 1,
                    marginBottom:
                        singleOpen && !folderControls.draft
                            ? '-0.75rem'
                            : '0rem',
                }}
                transition={transition}
                inert={singleOpen && !folderControls.draft}
                aria-hidden={singleOpen && !folderControls.draft}
                style={{
                    // Shown content inherits the Settings tab's visibility.
                    visibility:
                        singleOpen && !folderControls.draft
                            ? 'hidden'
                            : undefined,
                }}
            >
                <InstrumentFolderImport
                    {...folderControls}
                    isLoading={isLoading}
                    describedBy={`${id}-hint${error ? ` ${id}-error` : ''}`}
                />
                <p
                    id={`${id}-hint`}
                    className={
                        folderControls.draft
                            ? 'sr-only'
                            : 'mt-3 shrink-0 text-xs text-muted-foreground'
                    }
                >
                    Load a folder of audio samples to replace the whole
                    instrument. Pitches are detected from names such as C4.wav,
                    Ds4.mp3, or MIDI60.wav; edit any assignment before loading.
                    Missing notes use the nearest sample. Up to 128 samples and
                    200 MB total, 20 MB and 30 seconds per file. Samples stay in
                    this tab until reload.
                </p>
            </motion.div>
            {!folderControls.draft && (
                <Collapsible.Root
                    open={singleOpen}
                    onOpenChange={setSingleOpen}
                    className="shrink-0 border-t border-border pt-3"
                >
                    <Collapsible.Trigger className="group flex w-full cursor-pointer items-center gap-1 text-left text-sm font-bold focus-visible:outline-2 focus-visible:outline-ring">
                        <ChevronRight
                            aria-hidden="true"
                            className="size-3 transition-transform duration-300 group-data-[state=open]:rotate-90 motion-reduce:transition-none"
                        />
                        Use a single sample
                    </Collapsible.Trigger>
                    <Collapsible.Content forceMount asChild>
                        <motion.div
                            className="overflow-hidden"
                            initial={false}
                            animate={{
                                height: singleOpen ? 'auto' : 0,
                                opacity: singleOpen ? 1 : 0,
                            }}
                            transition={transition}
                            inert={!singleOpen}
                            aria-hidden={!singleOpen}
                            style={{
                                visibility: singleOpen ? undefined : 'hidden',
                            }}
                        >
                            <div className="space-y-3 pt-3">
                                <SampleRootSelect
                                    value={rootPitch}
                                    hasSample={Boolean(singleSample)}
                                    disabled={isLoading}
                                    onChange={(pitch) => {
                                        setDraftPitch(pitch);
                                        setRootPitch(pitch);
                                    }}
                                />
                                <ImportFileButton
                                    label="Import sample"
                                    loadingLabel="Loading sample…"
                                    fileLabel="Instrument audio file"
                                    accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a,.aif,.aiff"
                                    isLoading={isLoading}
                                    describedBy={`${id}-single-hint${error ? ` ${id}-error` : ''}`}
                                    onFile={(file) =>
                                        importSample(file, rootPitch)
                                    }
                                />
                                <p
                                    id={`${id}-single-hint`}
                                    className="text-sm text-muted-foreground"
                                >
                                    Or use one recording transposed across all
                                    pitches. Importing replaces the instrument
                                    for playback and key previews.
                                </p>
                            </div>
                        </motion.div>
                    </Collapsible.Content>
                </Collapsible.Root>
            )}
            {error && (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="text-sm text-destructive"
                >
                    {error}
                </p>
            )}
            {(instrument || isLoading) && (
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={resetSample}
                >
                    <RotateCcw aria-hidden="true" />
                    Restore piano
                </Button>
            )}
        </section>
    );
}
