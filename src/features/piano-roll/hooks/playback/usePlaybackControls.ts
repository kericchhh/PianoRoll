import * as Tone from 'tone';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getInstrumentStatus } from '@/features/piano-roll/audio/instrumentStatus';

const PIANO_STATUS_TOAST_ID = 'piano-samples';

export function usePlaybackControls({
    samplesReady,
    samplesFailed = false,
    onPlay,
    instrumentName = 'Piano',
    getPlaybackGeneration,
}: {
    samplesReady: boolean;
    samplesFailed?: boolean;
    onPlay: () => void;
    instrumentName?: string;
    getPlaybackGeneration?: () => number;
}) {
    const status = getInstrumentStatus(instrumentName);
    const mountedRef = useRef(false);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    useEffect(() => {
        if (samplesFailed) {
            toast.error(status.loadError, { id: PIANO_STATUS_TOAST_ID });
        } else if (samplesReady) {
            toast.success(status.ready, {
                id: PIANO_STATUS_TOAST_ID,
            });
        }
    }, [samplesReady, samplesFailed, status.ready, status.loadError]);

    return async function handlePlay(): Promise<void> {
        if (samplesFailed) {
            toast.error(status.loadError, { id: PIANO_STATUS_TOAST_ID });
            return;
        }
        if (!samplesReady) {
            toast.info(status.loading, { id: PIANO_STATUS_TOAST_ID });
            return;
        }
        const generation = getPlaybackGeneration?.();
        const isCurrent = () =>
            mountedRef.current && generation === getPlaybackGeneration?.();
        try {
            await Tone.start();
            if (isCurrent()) onPlay();
        } catch {
            if (isCurrent())
                toast.error(
                    'Could not enable audio. Press Play to try again.',
                    {
                        id: 'piano-audio',
                    },
                );
        }
    };
}
