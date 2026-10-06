import * as Tone from 'tone';
import { useEffect } from 'react';
import { toast } from 'sonner';

const PIANO_STATUS_TOAST_ID = 'piano-samples';
const PIANO_LOAD_ERROR = 'Could not load piano samples. Reload to try again.';

export function usePlaybackControls({
    samplesReady,
    samplesFailed = false,
    onPlay,
}: {
    samplesReady: boolean;
    samplesFailed?: boolean;
    onPlay: () => void;
}) {
    useEffect(() => {
        if (samplesFailed) {
            toast.error(PIANO_LOAD_ERROR, { id: PIANO_STATUS_TOAST_ID });
        } else if (samplesReady) {
            toast.success('Piano ready', { id: PIANO_STATUS_TOAST_ID });
        }
    }, [samplesReady, samplesFailed]);

    return async function handlePlay(): Promise<void> {
        if (samplesFailed) {
            toast.error(PIANO_LOAD_ERROR, { id: PIANO_STATUS_TOAST_ID });
            return;
        }
        if (!samplesReady) {
            toast.info('Loading piano samples…', { id: PIANO_STATUS_TOAST_ID });
            return;
        }
        try {
            await Tone.start();
            onPlay();
        } catch {
            toast.error('Could not enable audio. Press Play to try again.', {
                id: 'piano-audio',
            });
        }
    };
}
