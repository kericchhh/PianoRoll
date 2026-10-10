import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { toast } from 'sonner';
import {
    validateSampleFile,
    validateSampleRoot,
} from '@/features/piano-roll/audio/customSample';
import {
    prepareInstrumentFolder,
    type CustomInstrument,
    type InstrumentDraft,
} from '@/features/piano-roll/audio/customInstrument';
import { decodeInstrument } from '@/features/piano-roll/audio/decodeInstrument';

type Options = {
    instrument: CustomInstrument | null;
    onChange: (instrument: CustomInstrument | null) => void;
};

export function useCustomInstrument({ instrument, onChange }: Options) {
    const [draft, setDraft] = useState<InstrumentDraft | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadedCount, setLoadedCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const decodeRef = useRef<Promise<AudioBuffer> | null>(null);
    const lifetimeRef = useRef({
        active: false,
        generation: 0,
        pending: false,
    });
    useEffect(() => {
        const lifetime = lifetimeRef.current;
        lifetime.active = true;
        return () => {
            lifetime.active = false;
            lifetime.generation++;
        };
    }, []);

    function reportError(cause: unknown) {
        const message =
            cause instanceof RangeError
                ? cause.message
                : 'Could not load this instrument. Try browser-supported audio files.';
        setError(message);
        toast.error('Could not import instrument', {
            id: 'sample-import',
            description: message,
        });
    }

    async function loadFiles(incoming: InstrumentDraft): Promise<void> {
        const lifetime = lifetimeRef.current;
        if (lifetime.pending) return;
        lifetime.pending = true;
        const generation = ++lifetime.generation;
        const isCurrent = () =>
            lifetime.active && generation === lifetime.generation;
        setIsLoading(true);
        setLoadedCount(0);
        setError(null);
        try {
            const decoded = await decodeInstrument(incoming, {
                waitForDecoder: async () => {
                    await decodeRef.current?.catch(() => null);
                },
                decode: async (bytes) => {
                    const pending = Tone.getContext().decodeAudioData(bytes);
                    decodeRef.current = pending;
                    try {
                        return await pending;
                    } finally {
                        if (decodeRef.current === pending)
                            decodeRef.current = null;
                    }
                },
                isCurrent,
                onProgress: setLoadedCount,
            });
            if (decoded && isCurrent()) {
                onChange(decoded);
                setDraft(null);
            }
        } catch (cause) {
            if (isCurrent()) reportError(cause);
        } finally {
            if (isCurrent()) {
                lifetime.pending = false;
                setIsLoading(false);
            }
        }
    }

    async function importSample(file: File, rootPitch: number): Promise<void> {
        if (lifetimeRef.current.pending) return;
        try {
            validateSampleFile(file.size, rootPitch);
            await loadFiles({
                name: file.name,
                files: [{ id: file.name, file, rootPitch }],
            });
        } catch (cause) {
            reportError(cause);
        }
    }

    function chooseFolder(files: readonly File[]) {
        if (lifetimeRef.current.pending) return;
        try {
            setDraft(prepareInstrumentFolder(files));
            setError(null);
        } catch (cause) {
            reportError(cause);
        }
    }

    function setFilePitch(id: string, rootPitch: number | null) {
        if (lifetimeRef.current.pending) return;
        setDraft(
            (current) =>
                current && {
                    ...current,
                    files: current.files.map((entry) =>
                        entry.id === id ? { ...entry, rootPitch } : entry,
                    ),
                },
        );
        setError(null);
    }

    function removeFile(id: string) {
        if (lifetimeRef.current.pending) return;
        setDraft(
            (current) =>
                current && {
                    ...current,
                    files: current.files.filter((entry) => entry.id !== id),
                },
        );
        setError(null);
    }

    function cancelFolder() {
        lifetimeRef.current.generation++;
        lifetimeRef.current.pending = false;
        setIsLoading(false);
        setLoadedCount(0);
        setDraft(null);
        setError(null);
    }

    function resetSample() {
        cancelFolder();
        onChange(null);
    }

    function setRootPitch(rootPitch: number) {
        if (
            !instrument ||
            instrument.samples.length !== 1 ||
            isLoading ||
            instrument.samples[0].rootPitch === rootPitch
        )
            return;
        validateSampleRoot(rootPitch);
        onChange({
            ...instrument,
            samples: [{ ...instrument.samples[0], rootPitch }],
        });
    }

    return {
        instrument,
        importSample,
        resetSample,
        setRootPitch,
        isLoading,
        error,
        draft,
        chooseFolder,
        setFilePitch,
        removeFile,
        cancelFolder,
        loadedCount,
        loadFolder: () => (draft ? loadFiles(draft) : Promise.resolve()),
    };
}
