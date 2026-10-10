import { useCallback } from 'react';
import * as Tone from 'tone';
import { toast } from 'sonner';
import { DEFAULT_NOTE_VELOCITY } from '@/features/piano-roll/constants';

type Options = {
    samplesReady: boolean;
    samplesFailed: boolean;
    getPreviewSampler: () => Tone.Sampler | null;
};

export function usePianoPreview({
    samplesReady,
    samplesFailed,
    getPreviewSampler,
}: Options) {
    return useCallback(
        async (pitch: number): Promise<void> => {
            if (samplesFailed) {
                toast.error(
                    'Could not load piano samples. Reload to try again.',
                    {
                        id: 'piano-samples',
                    },
                );
                return;
            }
            if (!samplesReady) {
                toast.info('Loading piano samples…', { id: 'piano-samples' });
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
                    toast.error(
                        'Could not preview piano. Press a key to try again.',
                        {
                            id: 'piano-audio',
                        },
                    );
            }
        },
        [samplesReady, samplesFailed, getPreviewSampler],
    );
}
