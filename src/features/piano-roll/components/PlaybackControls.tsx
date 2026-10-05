import * as Tone from 'tone';
import { Play, Pause } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';

const PIANO_STATUS_TOAST_ID = 'piano-samples';
const PIANO_LOAD_ERROR = 'Could not load piano samples. Reload to try again.';

export function PlaybackControls({
    samplesReady,
    samplesFailed = false,
    onPlay,
    isPlaying,
}: {
    samplesReady: boolean;
    samplesFailed?: boolean;
    onPlay: () => void;
    isPlaying: boolean;
}) {
    useEffect(() => {
        if (samplesFailed) {
            toast.error(PIANO_LOAD_ERROR, { id: PIANO_STATUS_TOAST_ID });
        } else if (samplesReady) {
            toast.success('Piano ready', { id: PIANO_STATUS_TOAST_ID });
        }
    }, [samplesReady, samplesFailed]);

    async function handlePlay(): Promise<void> {
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
    }

    return (
        <div>
            <Button
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={handlePlay}
                type="button"
                size="icon"
            >
                {isPlaying ? (
                    <Pause aria-hidden="true" />
                ) : (
                    <Play aria-hidden="true" />
                )}
            </Button>
        </div>
    );
}
