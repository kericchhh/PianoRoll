import { useCallback } from 'react';
import * as Tone from 'tone';
import { toast } from 'sonner';
import { DEFAULT_NOTE_VELOCITY } from '@/features/piano-roll/constants';
import { getInstrumentStatus } from '@/features/piano-roll/audio/instrumentStatus';

type Options = {
    samplesReady: boolean;
    samplesFailed: boolean;
    getPreviewSampler: () => Tone.Sampler | null;
    instrumentName?: string;
};

export function usePianoPreview({
    samplesReady,
    samplesFailed,
    getPreviewSampler,
    instrumentName = 'Piano',
}: Options) {
    const status = getInstrumentStatus(instrumentName);
    return useCallback(
        async (pitch: number): Promise<void> => {
            if (samplesFailed) {
                toast.error(status.loadError, {
                    id: 'piano-samples',
                });
                return;
            }
            if (!samplesReady) {
                toast.info(status.loading, { id: 'piano-samples' });
                return;
            }
            let sampler: Tone.Sampler | null = null;
            try {
                sampler = getPreviewSampler();
                if (!sampler?.loaded) return;
                await Tone.start();
                if (sampler.disposed) return;
                sampler.triggerAttackRelease(
                    Tone.Midi(pitch).toNote(),
                    0.3,
                    Tone.now(),
                    DEFAULT_NOTE_VELOCITY / 127,
                );
            } catch {
                if (!sampler?.disposed)
                    toast.error(status.previewError, {
                        id: 'piano-audio',
                    });
            }
        },
        [
            samplesReady,
            samplesFailed,
            getPreviewSampler,
            status.loadError,
            status.loading,
            status.previewError,
        ],
    );
}
